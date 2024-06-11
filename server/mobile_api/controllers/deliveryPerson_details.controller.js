var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');
var OrderManagement = require('../../mobile_api/models/order_management.model');
var CustomerManagement = require('../../mobile_api/models/customer_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var Attendance = require('../../api/models/attendance_management.model');
var VilFresh_Version = require('../../mobile_api/models/app_version.model');
var RegionManagement = require('../../api/models/region_management.model');
var VilfreshMoney_management = require('../../mobile_api/models/VilfreshMoney_management.model');
var VilfreshCredit_management = require('../../api/models/VilfreshCredit_management.model');
var mongoose = require('mongoose');
var OTPVerify = '1234';
var moment = require('moment');
const axios = require('axios');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;

var options = {
    priority: 'high',
    timeToLive: 60 * 60 * 24
};


// Delivery Person Created System
exports.DeliveryPerson_Create_From_APP = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
    } else if (!ReceivingData.DeliveryPerson_Name || ReceivingData.DeliveryPerson_Name === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Name is required field" });
    }  else if (!ReceivingData.Region || ReceivingData.Region === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Region is required field" });
    } else {
       Promise.all([
         DeliveryPersonModel.DeliveryPersonSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         RegionManagement.RegionManagementSchema.findOne({_id: mongoose.Types.ObjectId(ReceivingData.Region)}).exec()
       ]).then(response => {
         var Existing = response[0];
         var Region = response[1];
         ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
			ReceivingData.DateOf_Birth = ReceivingData.DateOf_Birth !== '' ? moment(ReceivingData.DateOf_Birth, "YYYY/MM/DD HH:mm").toDate() : null;
			ReceivingData.Driving_License_ExpiryDate = ReceivingData.Driving_License_ExpiryDate !== '' ? moment(ReceivingData.Driving_License_ExpiryDate, "YYYY/MM/DD HH:mm").toDate() : null;
         if (Existing === null && Region !== null) {
             var DeliveryPersonRegister = new DeliveryPersonModel.DeliveryPersonSchema({
                 Mobile_Number: ReceivingData.Mobile_Number,
                 MobileVerify_OTP_No: '',
                 Password: '',
                 DeliveryPerson_Name: ReceivingData.DeliveryPerson_Name || '',
                 Email: ReceivingData.Email || '',
                 Region: ReceivingData.Region,
                 Gender: ReceivingData.Gender,
                 Address: ReceivingData.Address || '',
                 Area: '',
                 Alternate_Mobile_No: ReceivingData.Alternate_Mobile_No || '',
                 DateOf_Birth: ReceivingData.DateOf_Birth,    
                 Marital_Status: ReceivingData.Marital_Status || false,
                 Driving_License_No: ReceivingData.Driving_License_No,
                 Driving_License_ExpiryDate: ReceivingData.Driving_License_ExpiryDate,
                 CompanyId: Region.CompanyId,
                 Latitude: '',
                 Longitude: '',
                 OdooId: '',
                 LaterAttendance: true,
                 DeliveryLine: null,
                 ApprovalBy_User: null,
                 DeliveryPerson_Status: 'Pending',
                 Firebase_Token: '',
                 Device_Type: '',
                 Device_Id: '',
                 Pin: null,
                 Confirm_Pin: null,
                 Register_From: 'APP',
                 Active_Status: true,
                 If_Deleted: false,
             });
             DeliveryPersonRegister.save((err, result) => {
                 if (err) {
                     res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Delivery Person Details!", Error: err });
                 } else {
                    res.status(200).send({
                       Http_Code: 200, Status: true,
                       Message: 'Registration Successfully',
                       Mobile_Number: result.Mobile_Number,
                       DeliveryPerson_Name: result.DeliveryPerson_Name,
                       DeliveryPersonId: result._id
                    });
                 }
             });
         } else {
             res.status(200).send({ Http_Code: 200, Status: true, Message: 'Already Registered' });
         }
       }).catch(error => {
         res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
       });
    }

};


exports.DeliveryPerson_MobileNo_Verify = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
    }  else {
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number}).exec((err_5, DeliveryPersonDetails) => {
            if (err_5) {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The DeliveryPerson Details!.", Error: err });
            } else {
                if (DeliveryPersonDetails === null) {
                    res.status(200).send({
                       Http_Code: 201, // DeliveryPerson Not Registered
                       Status: true,
                       Message_Title: 'Registration',
                       Message: 'You Need to Complete Register Session First!!!...',
                       Response: DeliveryPersonDetails,
                    });
						} else if (DeliveryPersonDetails.Active_Status !== true || DeliveryPersonDetails.If_Deleted !== false) {
							res.status(200).send({
								Http_Code: 400, // Currently Deleted DeliveryPerson
								Status: true,
								Message: "Your Account Deleted/Deactivated",
								DeliveryPersonId: DeliveryPersonDetails._id,
								Mobile_Number: DeliveryPersonDetails.Mobile_Number,
								DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name
							});
                 } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Hold') {
                    res.status(200).send({
                       Http_Code: 204, // DeliveryPerson Registered But Not Requested
                       Status: true,
                       Message_Title: 'Your Request OnHold',
                       Message: 'Your Request has been Holded by Our Vilfresh Team !!!...',
                       DeliveryPersonId: DeliveryPersonDetails._id,
                       Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                       DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
                    });
                 } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Pending') {
                    res.status(200).send({
                       Http_Code: 203, //  Delivery Pending for Approve or Hold
                       Status: true,
                       Message_Title: 'Pending',
                       Message: 'Your Request to be Waiting for Approval through Our Vilfresh Team  !',
                       DeliveryPersonId: DeliveryPersonDetails._id,
                       Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                       DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name
                    });              
                 } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Approval') {
                    res.status(200).send({
                       Http_Code: 200, 
                       Status: true,
                       Message: 'Your App Activated..!!!',
                       DeliveryPersonId: DeliveryPersonDetails._id,
                       Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                       DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name
                    });
                 } else {
                    res.status(200).send({
                       Http_Code: 400, // Currently Active DeliveryPerson
                       Status: true,
                       Message: "Some Error Occurred!",
                       DeliveryPersonId: DeliveryPersonDetails._id,
                       Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                       DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name
                    });
                 }
            }
        });
    }
};

// DeliveryPerson Status verify
exports.DeliveryPerson_status_verify = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
       res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty!" });
    } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
       res.status(200).send({ Http_Code: 400, Status: false, Message: "OS Type can not be empty!" });
    } else {
       Promise.all([
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number }).exec(),
          VilFresh_Version.DeliveryPersonAppVersionSchema.findOne({ OS_Type: ReceivingData.Device_Type, Active_Status: true, If_Deleted: false }).exec(),
       ]).then(Response => {
          var DeliveryPersonDetails = Response[0];
          var APPVersion = Response[1];
          if (APPVersion !== null) {
             if (DeliveryPersonDetails === null) {
                res.status(200).send({
                   Http_Code: 201, // DeliveryPerson Not Registered
                   Status: true,
                   Message_Title: 'Registration',
                   Message: 'You Need to Complete Register Session First!!!...',
                   Response: DeliveryPersonDetails,
                   APPVersion: APPVersion.App_Version,
                   OS_Type: APPVersion.OS_Type
                });
				} else if (DeliveryPersonDetails.Active_Status !== true || DeliveryPersonDetails.If_Deleted !== false) {
					res.status(200).send({
						Http_Code: 400, // Currently Deleted DeliveryPerson
						Status: true,
						Message_Title: 'Account Not Active',
						Message: "Your Account Deleted/Deactivated",
						DeliveryPersonId: DeliveryPersonDetails._id,
						Mobile_Number: DeliveryPersonDetails.Mobile_Number,
						DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
						APPVersion: APPVersion.App_Version,
                  OS_Type: APPVersion.OS_Type
					});
             } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Hold') {
                res.status(200).send({
                   Http_Code: 204, // DeliveryPerson Registered But Not Requested
                   Status: true,
                   Message_Title: 'Your Request OnHold',
                   Message: 'Your Request has been Holded by Our Vilfresh Team !!!...',
                   DeliveryPersonId: DeliveryPersonDetails._id,
                   Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                   DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
                   APPVersion: APPVersion.App_Version,
                   OS_Type: APPVersion.OS_Type
                });
             } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Pending') {
                res.status(200).send({
                   Http_Code: 203, //  Delivery Pending for Approve or Hold
                   Status: true,
                   Message_Title: 'Pending',
                   Message: 'Your Request to be Waiting for Approval through Our Vilfresh Team  !',
                   DeliveryPersonId: DeliveryPersonDetails._id,
                   Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                   DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
                   APPVersion: APPVersion.App_Version,
                   OS_Type: APPVersion.OS_Type
                });              
             } else if (DeliveryPersonDetails.DeliveryPerson_Status === 'Approval') {
               if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else {
                  DeliveryPersonDetails.Firebase_Token = ReceivingData.Firebase_Token;
                  DeliveryPersonDetails.Device_Type = ReceivingData.Device_Type;
                  DeliveryPersonDetails.Device_Id = ReceivingData.Device_Id;
                  DeliveryPersonDetails.save();
               }
                res.status(200).send({
                   Http_Code: 200, 
                   Status: true,
                   Message: 'Your App Activated..!!!',
                   DeliveryPersonId: DeliveryPersonDetails._id,
                   Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                   DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
                   APPVersion: APPVersion.App_Version,
                   OS_Type: APPVersion.OS_Type
                });
             } else {
                res.status(200).send({
                   Http_Code: 400, // Currently Active DeliveryPerson
                   Status: true,
                   Message: "Some Error Occurred!",
                   DeliveryPersonId: DeliveryPersonDetails._id,
                   Mobile_Number: DeliveryPersonDetails.Mobile_Number,
                   DeliveryPerson_Name: DeliveryPersonDetails.DeliveryPerson_Name,
                   APPVersion: APPVersion.App_Version,
                   OS_Type: APPVersion.OS_Type,
                });
             }
          } else {
             res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid APP Version Details!" });
          }
       }).catch(error => {
          res.status(200).send({ Status: false, Message: "Some error occurred while customer details!.", Error: error });
       });
    }
 };

// DeliveryPerson Set Confirm Password
exports.DeliveryPerson_Set_Confirm_Password = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Details can not be empty" });
    } else if (!ReceivingData.Confirm_Pin || ReceivingData.Confirm_Pin === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Confirm Password can not be empty!" });
    } else {
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId), Active_Status: true, If_Deleted: false }).exec((err_5, result_1) => {
            if (err_5) {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err_5 });
            } else {
                if (result_1 !== null) {
                    DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId) },
                        {
                            $set: {
                                Password: ReceivingData.Confirm_Pin,
                                Pin: ReceivingData.Pin,
                                Confirm_Pin: ReceivingData.Confirm_Pin
                            }
                        }).exec();
                    res.status(200).send({
                        Http_Code: 200, Status: true,
                        Message: 'Successfully Updated for Password',
                        DeliveryPerson_Name: result_1.DeliveryPerson_Name,
                        Mobile_Number: result_1.Mobile_Number,
                        DeliveryPersonId: result_1._id
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Delivery Person Details!" });
                }
            }
        });
    }
};


// Delivery Person App Login System
exports.DeliveryPerson_Login = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
    } else if (!ReceivingData.Password || ReceivingData.Password === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Password can not be empty" });
    } else {
        DeliveryPersonModel.DeliveryPersonSchema
            .findOne({
                'Mobile_Number': ReceivingData.Mobile_Number,
                'Password': ReceivingData.Password,
                'Active_Status': true,
                'If_Deleted': false
            }, { Password: 0 }, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate The User Details!." });
                } else {
                    if (result !== null) {
                        var LoginHistory = new DeliveryPersonModel.DeliveryPerson_LoginHistorySchema({
                            User: result._id,
                            LastActive: new Date(),
                            Active_Status: true,
                            If_Deleted: false,
                        });
                        LoginHistory.save((err_2, result_2) => {
                            if (err_2) {
                                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the User Details!" });
                            } else {
                                res.status(200).send({ Http_Code: 200, Status: true, Message: "Your Account Permissions Restricted!" });
                            }
                        });
                    } else {
                        res.status(200).send({ Http_Code: 417, Status: false, Message: "Mobile Number and password do not match!" });
                    }
                }
            });
    }
};


// DeliveryPerson Assigned Orders
exports.DeliveryPerson_AssignedOrders = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        var DeliveryDate = new Date();
        DeliveryDate = new Date(DeliveryDate.setHours(0, 0, 0, 0));
        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).
                populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' }).exec(),
            OrderManagement.OrderSchema.find({ DeliveryPerson: ReceivingData.DeliveryPersonId, DeliveryDate: DeliveryDate, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false })
               .populate({ path: "CustomerId", select: ['Mobile_Number', 'Delivery_Line_Queue', 'Customer_Name', 'Address', 'Pincode', 'Latitude', 'Longitude'] })
               .populate({ path: 'Item_Details.ProductId', select: ["Category", "Product_Name", "Unit", "BasicUnitQuantity"] }).exec(),
				OrderManagement.OrderSchema.aggregate([
					{ $match: { DeliveryPerson: ReceivingData.DeliveryPersonId, DeliveryDate: DeliveryDate, OrderDelivered: true, Active_Status: true, If_Deleted: false } },
					{ $group : { _id : "$CustomerId" } },
					{ $project: { _id: 1} }
				]).exec(),
				OrderManagement.OrderSchema.aggregate([
					{ $match: { DeliveryPerson: ReceivingData.DeliveryPersonId, DeliveryDate: DeliveryDate, OrderUnDelivered: true, Active_Status: true, If_Deleted: false } },
					{ $group : { _id : "$CustomerId" } },
					{ $project: { _id: 1} }
				]).exec(),
        ]).then(Response => {

            var DeliveryPersonDetails = Response[0];
            var OrderDetails = JSON.parse(JSON.stringify(Response[1]));
            if (DeliveryPersonDetails !== null) {
                var DeliveryDetails = [];

                OrderDetails.map(res => {
                    var order = {
                        "OrderId": res._id,
                        "CustomerId": res.CustomerId._id,
                        "Customer_Name": res.CustomerId.Customer_Name,
                        "Mobile_Number": res.CustomerId.Mobile_Number,
                        "Address": res.CustomerId.Address,
                        "Pincode": res.CustomerId.Pincode || '',
                        "Latitude": res.CustomerId.Latitude,
                        "Longitude": res.CustomerId.Longitude,
                        "Delivery_Line_Queue": res.CustomerId.Delivery_Line_Queue,
                        "PaymentMode": res.Payment_Type,
                        "Items_Details": [],
                        "DeliveryDate": moment(res.DeliveryDate).format("DD-MM-YYYY"),
                        "DeliveryStatus": false,
                        "OrderedDate": moment(res.createdAt).format("DD-MM-YYYY")
                    };
                    const Index = DeliveryDetails.findIndex(obj => obj.CustomerId === res.CustomerId._id);
                    if (Index >= 0) {
                     res.Item_Details.map(resOrder => {
                        const Quantity = res.Order_Type === 'Subscription_From' ? resOrder.Quantity / resOrder.BasicUnitQuantity * resOrder.BasicUnitQuantity :  resOrder.Quantity * resOrder.BasicUnitQuantity;
                        DeliveryDetails[Index].Items_Details.push({
                           "Category": resOrder.ProductId.Category,
                           "Product_Name": resOrder.ProductId.Product_Name,
                           "Unit":  resOrder.ProductId.Unit,
                           "Quantity": Quantity,
                           "Unit_Price": resOrder.Unit_Price,
                           "Total_Amount": resOrder.Total_Amount
                        });
                     });
                     DeliveryDetails[Index].OrderedDate = moment(res.createdAt).format("DD-MM-YYYY");
                    } else {
                        res.Item_Details.map(resOrder => {
                           const Quantity = res.Order_Type === 'Subscription_From' ? resOrder.Quantity / resOrder.BasicUnitQuantity * resOrder.BasicUnitQuantity :  resOrder.Quantity * resOrder.BasicUnitQuantity;
                           order.Items_Details.push({
                              "Category": resOrder.ProductId.Category,
                              "Product_Name": resOrder.ProductId.Product_Name,
                              "Unit":  resOrder.ProductId.Unit,
                              "Quantity": Quantity,
                              "Unit_Price": resOrder.Unit_Price,
                              "Total_Amount": resOrder.Total_Amount
                           });
                        });
                        DeliveryDetails.push(order);
                    }
                });

                var UnQueue = DeliveryDetails.filter(obj => !obj.Delivery_Line_Queue || obj.Delivery_Line_Queue === undefined || obj.Delivery_Line_Queue === null);
                var Queue = DeliveryDetails.filter(obj => typeof obj.Delivery_Line_Queue === 'number' && obj.Delivery_Line_Queue > 0 );
                var QueueSort = Queue.sort((a, b) => parseFloat(a.Delivery_Line_Queue) - parseFloat(b.Delivery_Line_Queue));
                var ReturnRes = QueueSort.concat(UnQueue);
                
                res.status(200).send({
                    Http_Code: 200,
                    Status: true,
                    Message: "Your Orders Details!",
                    DeliveryPersonDetails: {
                        DeliveryPersonName: DeliveryPersonDetails.DeliveryPerson_Name,
                        DeliveryLine: DeliveryPersonDetails.DeliveryLine,
                        Mobile_Number: DeliveryPersonDetails.Mobile_Number
                    },
                    DeliveredCount: Response[2].length,
                    UnDeliveredCount: (ReturnRes.length + Response[3].length),
                    Response: ReturnRes
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid DeliveryPerson Details!" });
            }
        }).catch(error => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
        });

    }
};


// Order Delivered & UnDelivered  
exports.OrderDeliveredAndUnDelivered = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer details can not be empty" });
    } else if (!ReceivingData.OrderDelivered && !ReceivingData.OrderUnDelivered) {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivered Status can not be empty" });
    } else if (!ReceivingData.DeliveryDateTime || ReceivingData.DeliveryDateTime === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivered Date & Time can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        ReceivingData.DeliveryDateTime = moment(ReceivingData.DeliveryDateTime, "DD/MM/YYYY hh:mm").toDate().toISOString();
        var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
        var currentDate = new Date();
        var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec(),
            CustomerManagement.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {}).exec(),
            OrderManagement.OrderSchema.find({$and: [{ DeliveryDate: { $gte: startOfDay } }, { DeliveryDate: { $lte: endOfDay } }], CustomerId: ReceivingData.CustomerId, DeliveryPerson: ReceivingData.DeliveryPersonId, OrderConfirmed: true, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false }).exec(),
        ]).then(Response => {
            var DeliveryPerson = JSON.parse(JSON.stringify(Response[0]));
            var CustomerDetails = Response[1];
            var OrderDetails = Response[2];

            if (DeliveryPerson !== null && CustomerDetails !== null) {
               if (ReceivingData.OrderDelivered) {
                  Promise.all(
                     OrderDetails.map(obj =>  OrderManagement.OrderSchema.updateOne({ _id: obj._id }, { $set: { OrderDelivered: true, DeliveredSession: CurrentSession, DeliveredDateTime: ReceivingData.DeliveryDateTime } }).exec() )
                  ).then(response_1 => {
                     const Notification = new NotificationModel.NotificationSchema({
                        User: mongoose.Types.ObjectId(DeliveryPerson.ApprovedBy_User),
                        CustomerID: CustomerDetails._id,
                        DeliveryBoyID: DeliveryPerson._id,
                        Notification_Type: 'OrderDelivered',
                        Message: 'Your Orders successfully delivered by this Delivery Person: ' + DeliveryPerson.DeliveryPerson_Name + ' on ' + moment(new Date()).format("DD-MM-YYYY"),
                        Message_Received: false,
                        Message_Viewed: false,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Notification.save((err_2, result_2) => {
                        if (err_2) {
                           res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Notification Details!" });
                        } else {
                           var CustomerId = JSON.parse(JSON.stringify(CustomerDetails._id));
                           var payload = {
                              notification: {
                                 title: 'Vilfresh-Team',
                                 body: 'Your Orders successfully delivered by this Delivery Person: ' + JSON.parse(JSON.stringify(DeliveryPerson.DeliveryPerson_Name)) + ' on ' + JSON.parse(JSON.stringify(moment(new Date()).format("DD-MM-YYYY"))),
                                 sound: 'notify_tone.mp3'
                              },
                              data: {
                                 Customer: CustomerId,
                                 notification_type: 'OrderDelivered',
                                 click_action: 'FCM_PLUGIN_ACTIVITY',
                              }
                           };
									if (CustomerDetails.Firebase_Token !== '') {
										FCM_App.messaging().sendToDevice(CustomerDetails.Firebase_Token, payload, options).then((NotifyRes) => { });
									}
                           res.status(200).send({ Http_Code: 200, Status: true, Message: "Order SuccessFully Delivered." });
                        }
                     });
                  }).catch( error => {
                     res.status(200).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred Will Update the Order Delivery Status!" });
                  });
               } else if (ReceivingData.OrderUnDelivered) {
                  ReceivingData.DeliveryNotes = !ReceivingData.DeliveryNotes || ReceivingData.DeliveryNotes === '' ? '' : ReceivingData.DeliveryNotes;
                  var TotalReturnAmount = 0;
                  OrderDetails.map(obj => {
                     TotalReturnAmount = TotalReturnAmount + obj.Payable_Amount;
                  });

                  CustomerDetails.VilfreshMoney_Limit = parseFloat(CustomerDetails.VilfreshMoney_Limit);
                  CustomerDetails.VilfreshCredit_Limit = parseFloat(CustomerDetails.VilfreshCredit_Limit);           
                  CustomerDetails.AvailableCredit_Limit = parseFloat(CustomerDetails.AvailableCredit_Limit);
      
                  var NewCreditAvailable = CustomerDetails.AvailableCredit_Limit;
                  var NewWalletAmount = CustomerDetails.VilfreshMoney_Limit;
                  var CreditPaidAmount = CustomerDetails.VilfreshCredit_Limit - CustomerDetails.AvailableCredit_Limit;
      
                  if (TotalReturnAmount >= CreditPaidAmount) {
                     NewWalletAmount = NewWalletAmount + (TotalReturnAmount - CreditPaidAmount); 
                     NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
                  } else if (TotalReturnAmount < CreditPaidAmount) {
                     NewCreditAvailable = NewCreditAvailable + TotalReturnAmount;
                  }
      
                  if (NewWalletAmount > CustomerDetails.VilfreshMoney_Limit) {
                     const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                        Customer: CustomerDetails._id,
                        Amount: NewWalletAmount - CustomerDetails.VilfreshMoney_Limit,
                        Date: new Date(),
                        Previous_Limit: CustomerDetails.VilfreshMoney_Limit,
                        Available_Limit: NewWalletAmount,
                        Added_or_Reduced: "Added",
                        Added_Type: "Order_UnDeliver",
                        Added_Reference_Id: "",
                        Added_By_User: null,
                        CashFrom_DeliveryPerson: null,
                        Added_Approved_Status: true,
                        DateOf_Approved: new Date(),
                        Added_Approved_By: null,
                        PurposeOf_Reduce: "",
                        Order_Id: null,
                        Order_By: "",
                        Order_By_Person: "",
                        Region: CustomerDetails.Region,
                        Active_Status: true,
                        If_Deleted: false,
                     });
                     Create_VilfreshMoneyHistory.save();
                  }
                  if (NewCreditAvailable > CustomerDetails.AvailableCredit_Limit) {
                     const Create_VilfreshCreditHistory = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                        Customer: CustomerDetails._id,
                        Date: new Date(),
                        Credit_Limit: CustomerDetails.VilfreshCredit_Limit,
                        Previous_AvailableLimit: CustomerDetails.AvailableCredit_Limit,
                        Available_Limit: NewCreditAvailable,
                        Added_or_Reduced: 'Added',
                        Added_Type: "Order_UnDeliver",
                        Added_By_User: null,   
                        Added_Approved_Status: true,
                        DateOf_Approved: new Date(),
                        Added_Approved_By: null,
                        PurposeOf_Reduce: '',
                        Order_Id: null,
                        Order_By: '',
                        Order_By_Person: '',
                        Region: CustomerDetails.Region,
                        Active_Status: true,
                        If_Deleted: false,
                     });
                     Create_VilfreshCreditHistory.save();
                  }
                  CustomerDetails.AvailableCredit_Limit = NewCreditAvailable;
                  CustomerDetails.VilfreshMoney_Limit = NewWalletAmount;
                  Promise.all([
                     CustomerDetails.save(),
                     OrderDetails.map(obj =>  OrderManagement.OrderSchema.updateOne({ _id: obj._id }, { $set: { OrderUnDelivered: true, DeliveredDateTime: ReceivingData.DeliveryDateTime, DeliveredSession: CurrentSession, DeliveryNotes: ReceivingData.DeliveryNotes } }).exec() )
                  ]).then(response_1 => {
                     const Notification = new NotificationModel.NotificationSchema({
                        User: mongoose.Types.ObjectId(DeliveryPerson.ApprovedBy_User),
                        CustomerID: CustomerDetails._id,
                        DeliveryBoyID: DeliveryPerson._id,
                        Notification_Type: 'OrderUnDelivered',
                        Message: 'Your Orders would be Cancelled due to by this Delivery Person: ' + DeliveryPerson.DeliveryPerson_Name + ' on ' + moment(new Date()).format("DD-MM-YYYY"),
                        Message_Received: false,
                        Message_Viewed: false,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Notification.save((err_2, result_2) => {
                        if (err_2) {
                           res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Notification Details!" });
                        } else {
                           var CustomerId = JSON.parse(JSON.stringify(CustomerDetails._id));
                           var payload = {
                              notification: {
                                 title: 'Vilfresh-Team',
                                 body: 'Your Orders would be Cancelled due to by this Delivery Person: ' + JSON.parse(JSON.stringify(DeliveryPerson.DeliveryPerson_Name)) + ' on ' + moment(new Date()).format("DD-MM-YYYY"),
                                 sound: 'notify_tone.mp3'
                              },
                              data: {
                                 Customer: CustomerId,
                                 notification_type: 'OrderUnDelivered',
                                 click_action: 'FCM_PLUGIN_ACTIVITY',
                              }
                           };
									if (CustomerDetails.Firebase_Token !== '') {
                           	FCM_App.messaging().sendToDevice(CustomerDetails.Firebase_Token, payload, options).then((NotifyRes) => { });
									}
                           res.status(200).send({ Http_Code: 200, Status: true, Message: "Order Delivery Status Successfully Updated." });
                        }
                     });
                  }).catch( error => {
                     res.status(200).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred Will Update the Order Delivery Status!" });
                  });
                }
            } else {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
            }
        }).catch(errorRes => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


// DeliveryPerson Tracking Yes Or No
exports.DeliveryPersonTrackingYesOrNo = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        Promise.all([
            OrderManagement.OrderSchema.find({ DeliveryPerson: ReceivingData.DeliveryPersonId, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false })
                .exec(),
        ]).then(Response => {
            var DeliveryDetails = Response[0];
            if (DeliveryDetails.length !== 0) {
                res.status(200).send({ Http_Code: 200, Status: true, Message: "Your Delivery line Assigned Orders!." });
            } else {
                res.status(200).send({ Http_Code: 200, Status: false, Message: "Your haven't no Orders" });
            }
        }).catch(errorRes => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


// Delivery Person Profile View
exports.DeliveryPersonGPSUpdate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else if (!ReceivingData.Latitude || ReceivingData.Latitude === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Latitude can not be empty" });
    } else if (!ReceivingData.Longitude || ReceivingData.Longitude === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Longitude can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
      //   const latLongDistance = (lat1, lon1, lat2, lon2, unit) => {
      //    if (lat1 == lat2 && lon1 == lon2) {
      //      return 0;
      //    } else {
      //      var radlat1 = (Math.PI * lat1) / 180;
      //      var radlat2 = (Math.PI * lat2) / 180;
      //      var theta = lon1 - lon2;
      //      var radtheta = (Math.PI * theta) / 180;
      //      var dist =
      //        Math.sin(radlat1) * Math.sin(radlat2) +
      //        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      //      if (dist > 1) {
      //        dist = 1;
      //      }
      //      dist = Math.acos(dist);
      //      dist = (dist * 180) / Math.PI;
      //      dist = dist * 60 * 1.1515;
      //      if (unit == "K") {
      //        dist = dist * 1.609344;
      //      }
      //      if (unit == "N") {
      //        dist = dist * 0.8684;
      //      }
      //      return dist;
      //    }
      //  };
        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec(),
        ]).then(Response => {
            var DeliveryPersonDetails = Response[0];

            if (DeliveryPersonDetails !== null) {
                DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: ReceivingData.DeliveryPersonId },
                    {
                        $set: {
                            Latitude: ReceivingData.Latitude,
                            Longitude: ReceivingData.Longitude
                        }
                    }).exec();
                res.status(200).send({ Http_Code: 200, Status: true, Message: "Delivery Person SuccessFully Updated" });
            } else {
                res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Delivery Person Details" });
            }
        }).catch(errorRes => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


// DeliveryPerson Order Delivery Details
exports.DeliveryPerson_OrderDeliveryDetails = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        var currentDate = new Date();
        var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec(),
            OrderManagement.OrderSchema.find({
                DeliveryPerson: ReceivingData.DeliveryPersonId, Order_Type: {$ne: 'Sample_From'},
                $and: [{ DeliveryDate: { $gte: startOfDay } }, { DeliveryDate: { $lte: endOfDay } }], Active_Status: true, If_Deleted: false
            })
            .populate({ path: "CustomerId", select: ['Mobile_Number', 'Customer_Name', 'Address', 'Pincode', 'Latitude', 'Longitude', 'Delivery_Person_QA', 'QA_Analytics'] })
            .populate({ path: 'Item_Details.ProductId', select: ["Category", "Product_Name"] }).exec(),
        ]).then(Response => {
            var DeliveryPersonDetails = Response[0];
            var DeliveredDetails = JSON.parse(JSON.stringify(Response[1]));

            if (DeliveryPersonDetails !== null && DeliveredDetails.length !== 0) {
                var DeliveryDetails = [];

                DeliveredDetails.map(res => {
                    var order = {
                        "OrderId": res._id,
                        "CustomerId": res.CustomerId._id,
                        "Customer_Name": res.CustomerId.Customer_Name,
                        "Mobile_Number": res.CustomerId.Mobile_Number,
                        "Address": res.CustomerId.Address,
                        "Pincode": res.CustomerId.Pincode || '',
                        "Latitude": res.CustomerId.Latitude,
                        "Longitude": res.CustomerId.Longitude,
                        "Delivery_Line_Queue": res.CustomerId.Delivery_Line_Queue,
                        "PaymentMode": res.Payment_Type,
                        "Items_Details": [],
                        "DeliveryDate": moment(res.DeliveryDate).format("DD-MM-YYYY"),
                        "QAUpdated": (res.CustomerId.Delivery_Person_QA !== undefined && res.CustomerId.Delivery_Person_QA !== null && res.CustomerId.QA_Analytics !== undefined && res.CustomerId.QA_Analytics.length > 0) ? true : false
                    };
                    const Index = DeliveryDetails.findIndex(obj => obj.CustomerId === res.CustomerId._id);
                    if (Index >= 0) {
                     res.Item_Details.map(resOrder => {
                        DeliveryDetails[Index].Items_Details.push({
                           "Category": resOrder.ProductId.Category,
                           "Product_Name": resOrder.ProductId.Product_Name,
                           "Unit":  resOrder.ProductId.Unit,
                           "Quantity": resOrder.Quantity,
                           "Unit_Price": resOrder.Unit_Price,
                           "Total_Amount": resOrder.Total_Amount
                        });
                     });
                     DeliveryDetails[Index].OrderedDate = moment(res.createdAt).format("DD-MM-YYYY");
                    } else {
                        res.Item_Details.map(resOrder => {
                           order.Items_Details.push({
                              "Category": resOrder.ProductId.Category,
                              "Product_Name": resOrder.ProductId.Product_Name,
                              "Unit":  resOrder.ProductId.Unit,
                              "Quantity": resOrder.Quantity,
                              "Unit_Price": resOrder.Unit_Price,
                              "Total_Amount": resOrder.Total_Amount
                           });
                        });
                        DeliveryDetails.push(order);
                    }
                });

                var UnQueue = DeliveryDetails.filter(obj => !obj.Delivery_Line_Queue || obj.Delivery_Line_Queue === undefined || obj.Delivery_Line_Queue === null);
                var Queue = DeliveryDetails.filter(obj => typeof obj.Delivery_Line_Queue === 'number' && obj.Delivery_Line_Queue > 0 );
                var QueueSort = Queue.sort((a, b) => parseFloat(a.Delivery_Line_Queue) - parseFloat(b.Delivery_Line_Queue));
                var ReturnRes = QueueSort.concat(UnQueue);
                
                res.status(200).send({
                    Http_Code: 200,
                    Status: true,
                    Message: "Order Delivered and UnDelivered Details!",
                    Response: ReturnRes
                });
            } else {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
            }
        }).catch(errorRes => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


//  Delivery Boy Direct Collection Amount
exports.Collection_Amount = function (req, res) {
    var ReceivingData = req.body;

    ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
    ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "DeliveryPersonId can not be empty" });
    } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "CustomerId can not be empty" });
    } else {
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec((err, result_1) => {
            if (err) {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err });
            } else {
                if (result_1 !== null) {
                    var CollectionRegister = new DeliveryPersonModel.CollectionSchema({
                        CustomerID: ReceivingData.CustomerId,
                        DeliveryPersonId: ReceivingData.DeliveryPersonId,
                        Collection_Amount: ReceivingData.Collection_Amount,
                        DeliveryLine: result_1.DeliveryLine,
                        Region: result_1.Region,
                        AddedBy_User: ReceivingData.DeliveryPersonId,
                        Collection_Status: 'Pending',
                        CollectionApprovedBy_User: null,
                        Active_Status: true,
                        If_Deleted: false,
                    });
                    CollectionRegister.save((err, result) => {
                        if (err) {
                            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate the Amount details!", Error: err });
                        } else {                            
                            res.status(200).send({
                                Http_Code: 200, Status: true,
                                Message: 'Amount collected Successfully',
                            });

                            const Notification = new NotificationModel.NotificationSchema({
                                CustomerID: result.CustomerId,
                                DeliveryBoyID: ReceivingData.DeliveryPersonId,
                                Notification_Type: 'DeliveryBoy_Collection',
                                Message: 'Your Amount Rs. ' + result.Collection_Amount + ' Collected by : ' + result_1.DeliveryPerson_Name + ' ',
                                Message_Received: false,
                                Message_Viewed: false,
                                Active_Status: true,
                                If_Deleted: false
                            });
                            Notification.save((err_2, result_2) => {
                                if (err_2) {
                                    res.status(200).send({ Status: false, Message: "Some error occurred while Notification system!", Error: err_2 });
                                } else {
                                    result_2 = JSON.parse(JSON.stringify(result_2));
                                    var payload = {
                                        notification: {
                                            title: 'Vilfresh-Team',
                                            body: 'Your Amount to be Collected By ' + result_1.DeliveryPerson_Name + moment(new Date()).format("DD/MM/YYYY"),
                                            sound: 'notify_tone.mp3'
                                        },
                                        data: {
                                            Customer: JSON.parse(JSON.stringify(ReceivingData.CustomerId)),
                                            notification_type: 'DeliveryBoy_Collection',
                                            click_action: 'FCM_PLUGIN_ACTIVITY',
                                        }
                                    };
												if (result_2.Firebase_Token !== '') {
                                    	FCM_App.messaging().sendToDevice(result_2.Firebase_Token, payload).then((NotifyRes) => { });
												}
                                }
                            });
                        }
                    });
                } else {
                    res.status(200).send({ Http_Code: 200, Status: true, Message: 'Delivery Boy Not Valid ' });
                }
            }
        });
    }
};


// DeliveryPerson Current Month Attendance Details
exports.DeliveryPerson_CurrentMonthAttendance_Details = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else if (!ReceivingData.Date || ReceivingData.Date === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Date details can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        var date = new Date(moment(ReceivingData.Date, 'DD-MM-YYYY'));

        var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec((err_5, result_1) => {
            if (err_5) {
                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err_5 });
            } else {
                if (result_1 !== null) {
                    Promise.all([
                        Attendance.DeliveryPerson_AttendanceSchema.find({
                            DeliveryPersonId: ReceivingData.DeliveryPersonId,
                            $and: [{ Date: { $gte: firstDay } },
                            { Date: { $lte: lastDay } }],
                            Active_Status: true, If_Deleted: false
                        }).exec(),
                    ]).then(Response => {
                        var AttendanceDetails = Response[0];
                        var AttendanceArr = [];

                        const DuplicateDates = [];
                           AttendanceDetails.map(obj => {
                              if (!DuplicateDates.includes(new Date(obj.Date).valueOf())) {
                                 const Arr = AttendanceDetails.filter(objNew => new Date(objNew.Date).valueOf() === new Date(obj.Date).valueOf());
                                 if (Arr.length > 1) {
                                    const MorObj = Arr[0].Morning !== null ? Arr[0] : Arr[1];
                                    const EveObj = Arr[0].Evening !== null ? Arr[0] : Arr[1];
                                    MorObj.Evening = EveObj.Evening;
                                    obj = MorObj;
                                    DuplicateDates.push(new Date(obj.Date).valueOf());
                                 }
                                 var StaticValue = {
                                    Date: moment(obj.Date).format("DD/MM/YYYY"),
                                    AttendanceStatus: 'Absent'
                                };
                                if (obj.Morning === true && (obj.Evening === null || obj.Evening === false) ) {
                                    StaticValue.AttendanceStatus = 'HalfDay';
                                } else if (obj.Evening === true && (obj.Morning === null || obj.Morning === false)) {
                                    StaticValue.AttendanceStatus = 'HalfDay';
                                } else if (obj.Morning === true && obj.Evening === true) {
                                    StaticValue.AttendanceStatus = 'Present';
                                }
                                AttendanceArr.push(StaticValue);
                              } 
                           });
                        res.status(200).send({
                            Http_Code: 200, Status: true, Message: 'Attendance Details',
                            Response: {
                                DeliveryPerson_Name: result_1.DeliveryPerson_Name,
                                Mobile_Number: result_1.Mobile_Number,
                                Email: result_1.Email,
                                Attendance: AttendanceArr
                            }
                        });
                    }).catch(errorRes => {
                        res.status(200).send({ Http_Code: 417, Status: false, Message: 'Some Occurred Error' });
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: false, Message: 'Invalid DeliveryPerson Details' });
                }
            }
        });
    }
};