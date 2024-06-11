
var User_Management = require('../models/user_management.model');
var Region_Management = require('../models/region_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var CryptoJS = require("crypto-js");
var crypto = require("crypto");
var parser = require('ua-parser-js');
var mongoose = require('mongoose');


// User Login System
exports.VilFreshUser_Login = function (req, res) {
    var ReceivingData = req.body;
    var today = new Date();
    today.setHours(today.getHours() - 2);
    User_Management.LoginHistorySchema.updateMany(
       { LastActive : { $lte: today }, Active_Status: true, If_Deleted: false },
       { $set: { Active_Status: false } }
    ).exec();
 
    if (!ReceivingData.User_Name || ReceivingData.User_Name === '') {
        res.status(400).send({ Status: false, Message: "User Name can not be empty" });
    } else if (!ReceivingData.User_Password || ReceivingData.User_Password === '') {
        res.status(400).send({ Status: false, Message: "User Password can not be empty" });
    } else {
        User_Management.UserManagementSchema
            .findOne({
                'User_Name': { $regex: new RegExp("^" + ReceivingData.User_Name + "$", "i") },
                'Password': ReceivingData.User_Password,
                'Active_Status': true,
                'If_Deleted': false
            }, { Password: 0 }, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, ErrorCode: 417, Message: "Some error occurred while Validate The User Details!." });
                } else {
                    if (result === null) {
                     User_Management.UserManagementSchema.findOne({'User_Name': ReceivingData.User_Name }, function(err_1, result_1) {
                        if(err_1) {
                           res.status(417).send({Status: false, ErrorCode: 417, Message: "Some error occurred while Validate the User Name!"});           
                        } else {
                           if (result_1 === null) {
                              res.status(200).send({ Status: false, Message: "Invalid account details!" });
                           } else {
                              if (result_1.User_Type !== 'admin') {
                                 res.status(200).send({ Status: false, Message: "Invalid User Type Account details!" });
                              } else if (result_1.Active_Status && !result_1.If_Deleted ) {
                                 res.status(200).send({ Status: false, Message: "User Name and password do not match!" });
                              } else {
                                 res.status(200).send({ Status: false, Message: "Your Account has Deactivated or Removed!" });
                              }
                           }
                        }
                     });
                   } else {
                     var RandomToken = crypto.randomBytes(32).toString("hex");
                     var UserData = JSON.parse(JSON.stringify(result));
                     UserData.Token = RandomToken;
                     var UserHash = CryptoJS.SHA512(JSON.stringify(UserData)).toString(CryptoJS.enc.Hex);
                     var Ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
                     var DeviceInfo = parser(req.headers['user-agent']);
                     var LoginFrom = JSON.stringify({
                         Ip: Ip,
                         Request_From_Origin: req.headers.origin,
                         Request_From: req.headers.referer,
                         Request_Url: req.url,
                         Request_Body: req.body,
                         If_Get: req.params,
                         Device_Info: DeviceInfo,
                     });
                     var LoginHistory = new User_Management.LoginHistorySchema({
                         User: result._id,
                         LoginToken: RandomToken,
                         Hash: UserHash,
                         LastActive: new Date(),
                         LoginFrom: LoginFrom,
                         Active_Status: true,
                         If_Deleted: false,
                     });
                     LoginHistory.save((err_2, result_2) => {
                         if (err_2) {
                             res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the User Details!" });
                         } else {
                           // res.status(200).send({ Status: true, Key: RandomToken, Message: 'Successfully Login', User: result._id, User_Name: result.Name });   
                           var ReturnResponse = CryptoJS.AES.encrypt(JSON.stringify(result), RandomToken.slice(3, 10)).toString();
                           res.status(200).send({ Status: true, Key: RandomToken, Response: ReturnResponse });}
                     });
                        // res.status(200).send({ Status: false, Message: "Your Account has Deactivated or Removed!" });
                    }
                }
            });
    }
};


// VilFresh User Logout
exports.VilFreshUser_Logout = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.LoginHistorySchema
         .findOne({
            'User': ReceivingData.User, 'Active_Status': true, 'If_Deleted': false
         }, {}, {}).exec(function (err4, result4) {
            if (err4) {
               res.status(417).send({ Status: false, ErrorCode: 417, Message: "Some error occurred while Validate The User Details!." });
            } else {
               if (result4 !== null) {
                  User_Management.LoginHistorySchema
                     .updateOne({ User: ReceivingData.User, Active_Status: true, If_Deleted: false }, { $set: { Active_Status: false } })
                     .exec(function (err, result_1) {
                        if (err) {
                           res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
                        } else {
                           res.status(200).send({ Status: true, Message: "User Successfully Logout" });
                        }
                     });
               } else {
                  res.status(417).send({ Status: false, Message: "Invalid User Credentials!." });
               }
            }
         });
   }
};


// VilFresh User Create
exports.VilFreshUser_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User_Name || ReceivingData.User_Name === '') {
      res.status(400).send({ Status: false, Message: "User Name can not be empty" });
   } else if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(400).send({ Status: false, Message: "Region can not be empty" });
   } else {
      Region_Management.RegionManagementSchema.findOne({ OdooId: ReceivingData.Region }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the User!.", Error: err });
         } else {
            if (result !== null) {
               var Create_VilFreshUser = new User_Management.UserManagementSchema({
                  User_Name: ReceivingData.User_Name || '',
                  Password: ReceivingData.Password || '123456',
                  Name: ReceivingData.Name || '',
                  Email: ReceivingData.Email || '',
                  Phone: ReceivingData.Phone || '',
                  Region: result._id || null,
                  OdooId: ReceivingData.OdooId || '',
                  CompanyId: ReceivingData.CompanyId || '',
                  User_Type: ReceivingData.User_Type || '',
                  Active_Status: true,
                  If_Deleted: false
               });
               Create_VilFreshUser.save(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Creating the User Management!.", Error: err_1 });
                  } else {
                     res.status(200).send({ Status: true, Response: result_1 });
                  }
               });
            } else {
               res.status(417).send({ Status: false, Message: 'Region Details Invalid!' });
            }
         }
      });
   }
};


// VilFresh User List
exports.Users_List = function (req, res) {
   User_Management.UserManagementSchema.find({ Active_Status: true, If_Deleted: false }, {}, {})
      .exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
         } else {
            if (result === null || result.length === 0) {
               res.status(200).send({ Status: true, Message: 'No Data Found' });
            } else {
               res.status(200).send({ Status: true, Message: 'User Details List', Response: result });
            }
         }
      });
};


//User Details View
exports.UserDetails_Edit = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details is Required!" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User), Active_Status: true, If_Deleted: false }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Response: result });
               } else {
                  res.status(400).send({ Status: true, Message: "Invalid User Details" });
               }
            }
         });
   }
};


// Users Details Delete Status 
exports.UserDetails_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema
         .updateOne({ OdooId: ReceivingData.OdooId }, { $set: { Active_Status: false, If_Deleted: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Message: 'User SuccessFully Removed' });
            }
         });
   }
};


// User Details Update
exports.UserDetails_Update = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      Promise.all([
         Region_Management.RegionManagementSchema.findOne({ OdooId: ReceivingData.Region }, {}, {}).exec(),
         User_Management.UserManagementSchema.findOne({ "OdooId": ReceivingData.OdooId }, {}, {}).exec()
      ]).then(response => {
         var Region = response[0];
         var User = response[1];
         if (User !== null) {
            User.User_Name = ReceivingData.User_Name || '';
            User.Password = ReceivingData.Password || User.Password;
            User.Name = ReceivingData.Name || '';
            User.Email = ReceivingData.Email || '';
            User.Phone = ReceivingData.Phone || '';
            User.Region = Region._id || User.Region;
            User.User_Type = ReceivingData.User_Type || 'admin';
            User.CompanyId = ReceivingData.CompanyId || '';
            User.save(function (err_2, result_2) {
               if (err_2) {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the User Management!.", Error: err_2 });
               } else {
                  res.status(200).send({ Status: true, Message: 'Successfully Updated User Details' });
               }
            });
         } else {
            res.status(417).send({ Status: false, Message: 'Invalid User Details' });
         }
      }).catch(error => {
         res.status(417).send({ Status: false, Message: 'Some Error Occurred!' });
      });
   }
};


// All Notifications List
exports.All_Notifications_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      NotificationModel.NotificationSchema.find({
         User: ReceivingData.User,
         $or: [{ Notification_Type: 'NewCustomer_Registration' },
         { Notification_Type: 'CustomerSample_Pending' },
         { Notification_Type: 'CustomerWaiting_Subscription' },
         { Notification_Type: 'CustomerSubscription_Activated' },
         { Notification_Type: 'CustomerGenerator_Order' },
         { Notification_Type: 'CustomerSupportCreated' },
         { Notification_Type: 'CustomerGeneratePurchaseRequest' },
         { Notification_Type: 'Order_Delay'}], Active_Status: true, If_Deleted: false
      }, {}, { 'sort': { createdAt: -1 } })         
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               var Notification_Ids = [];
               result.map(obj => {
                  Notification_Ids.push(obj._id);
               });
               NotificationModel.NotificationSchema.updateMany({ _id: { $in: Notification_Ids } }, { $set: { Message_Received: true } }).exec();
               res.status(200).send({ Status: true, Response: result });
            }
         });
   }
};


//Notification Counts
exports.Notification_Counts = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      NotificationModel.NotificationSchema.countDocuments({
         User: ReceivingData.User,
         $or: [{ Notification_Type: 'NewCustomer_Registration' },
         { Notification_Type: 'CustomerSample_Pending' },
         { Notification_Type: 'CustomerWaiting_Subscription' },
         { Notification_Type: 'CustomerSubscription_Activated' },
         { Notification_Type: 'CustomerGenerator_Order' },
         { Notification_Type: 'CustomerSupportCreated' },
         { Notification_Type: 'CustomerGeneratePurchaseRequest' },
         { Notification_Type: 'Order_Delay'}
      ], Message_Viewed: false, Active_Status: true, If_Deleted: false
      })
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Response: result });
            }
         });
   }
};


// Delete All Read Notifications
exports.DeleteAllReadNotifications = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      NotificationModel.NotificationSchema.updateMany({
         User: ReceivingData.User,
         Message_Viewed: true,
         $or: [{ Notification_Type: 'NewCustomer_Registration' },
         { Notification_Type: 'CustomerSample_Pending' },
         { Notification_Type: 'CustomerWaiting_Subscription' },
         { Notification_Type: 'CustomerSubscription_Activated' },
         { Notification_Type: 'CustomerGenerator_Order' },
         { Notification_Type: 'CustomerSupportCreated' },
         { Notification_Type: 'CustomerGeneratePurchaseRequest' },
         { Notification_Type: 'Order_Delay'}], Active_Status: true, If_Deleted: false
      }, { $set: { If_Deleted: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Message: "Successfully Update for Notification", Response: result });
            }
         });
   }
};



// Mark All As Read Notifications
exports.MarkAllAsReadNotifications = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      NotificationModel.NotificationSchema.updateMany({
         User: ReceivingData.User,
         $or: [{ Notification_Type: 'NewCustomer_Registration' },
         { Notification_Type: 'CustomerSample_Pending' },
         { Notification_Type: 'CustomerWaiting_Subscription' },
         { Notification_Type: 'CustomerSubscription_Activated' },
         { Notification_Type: 'CustomerGenerator_Order' },
         { Notification_Type: 'CustomerSupportCreated' },
         { Notification_Type: 'CustomerGeneratePurchaseRequest' },
         { Notification_Type: 'Order_Delay'}], Active_Status: true, If_Deleted: false
      }, { $set: { Message_Viewed: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Message: "SuccessFully Mark All As Read Notification", Response: result });
            }
         });
   }
};


exports.Read_Notification = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   }else if (!ReceivingData.Notification || ReceivingData.Notification === '') {
      res.status(400).send({ Status: false, Message: "Notification Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      NotificationModel.NotificationSchema.updateOne({
         _id: mongoose.Types.ObjectId(ReceivingData.Notification),
         User: ReceivingData.User, Active_Status: true, If_Deleted: false
      }, { $set: { Message_Viewed: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
            } else {
               res.status(200).send({ Status: true, Message: "SuccessFully Read Notification" });
            }
         });
   }
};





