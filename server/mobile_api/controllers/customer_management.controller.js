var Customer_Management = require('../../mobile_api/models/customer_management.model');
var ProductManagement = require('../../../server/api/models/product_management.model');
var User_Management = require('../../../server/api/models/user_management.model');
var VilFresh_Version = require('../../../server/mobile_api/models/app_version.model');
var RegionManagement = require('../../api/models/region_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');
var DeviceManagement = require('../../mobile_api/models/temp_customers.model');
var MyCart_History = require('../../mobile_api/models/mycart.model');
var OrderManagement = require('../../mobile_api/models/order_management.model');
var mongoose = require('mongoose');
var moment = require('moment');
var OTPVerify = '1234';
var Forgot_OTpVerify = '1234';
const axios = require('axios');
var fs = require('fs');
var FCM_App = require('./../../../Config/fcm_config').CustomerNotify;
 
var options = {
 priority: 'high',
 timeToLive: 60 * 60 * 24
};
var SMS_System = require('./../../../Config/sms_config');


// OTP Generator Customer Number
exports.OTP_Generator = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
   } else {
      if (ReceivingData.Mobile_Number === '9080261517') {
         res.status(200).send({ Http_Code: 200, Status: true, Response: 'Success', OTP: 357654 });
      } else {
         var OTP = Math.floor(100000 + Math.random() * 900000);
         SMS_System.sendOTP(ReceivingData.Mobile_Number, OTP, (error, response) => {
            if (error) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Response: response.status, OTP: OTP });
            }
         });
      }
   }
};



// Customer Mobile number verify
exports.Customer_MobileNo_Verify = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty!" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result === null) {
               res.status(200).send({
                  Http_Code: 201, // Customer Not Registered
                  Status: true,
                  Message: 'You need to register a session first!!!...',
                  Response: result
               });
            } else if (result.Customer_Status === 'InActivated') {
               res.status(200).send({
                  Http_Code: 203, //  Customer Deactivated
                  Status: true,
                  Message_Title: 'Your Account InActivated',
                  Message: "Please Contact our Vilfresh Team!",
                  CustomerId: result._id,
                  Mobile_Number: result.Mobile_Number,
                  Customer_Name: result.Customer_Name,
                  Email: result.Email
               });
            } else {
					if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else {
                  result.Firebase_Token = ReceivingData.Firebase_Token;
                  result.Device_Type = ReceivingData.Device_Type;
                  result.Device_Id = ReceivingData.Device_Id;
                  result.save();
						DeviceManagement.TempCustomersSchema.findOne({ DeviceId: ReceivingData.Device_Id, Active_Status: true, If_Deleted: false }, {}, {})
						.exec((err_1, result_1) => {
							if (!err_1 && result_1 !== null) {
								if (result_1.Region !== null && JSON.parse(JSON.stringify(result_1.Region)) === JSON.parse(JSON.stringify(result.Region))) {
									MyCart_History.MyCartSchema.find({CustomerId: result._id, Active_Status: true, If_Deleted: false}, {ProductId: 1}, {}).exec((err_2, result_2) => {
										if (!err_2) {
											var productIds = [];
											result_2.map(obj => {
												productIds.push(JSON.parse(JSON.stringify(obj.ProductId)));
											});
											DeviceManagement.TempCartSchema.find({ TempCustomer: result_1._id, Active_Status: true, If_Deleted: false }, {}, {})
											.exec((err_3, result_3) => {
												if (!err_3 && result_3.length > 0) {
													result_3 = JSON.parse(JSON.stringify(result_3));
													result_3.map(Obj => {
														const match = productIds.includes(JSON.parse(JSON.stringify(Obj.ProductId)));
														if (!match) {
															var MyCartCreate = new MyCart_History.MyCartSchema({
																ProductId: Obj.ProductId,
																CustomerId: result._id,
																Date: Obj.Date,
																Quantity: Obj.Quantity,
																Active_Status: true,
																If_Deleted: false,
															});
															MyCartCreate.save();
														}
													});
												}
												DeviceManagement.TempCustomersSchema.updateOne({_id: result_1._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
												DeviceManagement.TempCartSchema.updateMany({TempCustomer: result_1._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
											});
										}
									});
								} else {
									DeviceManagement.TempCustomersSchema.updateOne({_id: result_1._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
									DeviceManagement.TempCartSchema.updateMany({TempCustomer: result_1._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
								}
							}
						});
						var returnStatusCode = 200;
						var returnMessage = "Approved Customer!";
						if (result.IfApprovedBy_User === false) {
							returnStatusCode = 202;
							returnMessage = "Customer not approved!";
						}
                  res.status(200).send({
                     Http_Code: returnStatusCode,
                     Status: true,
                     Message: returnMessage,
                     CustomerId: result._id,
                     Mobile_Number: result.Mobile_Number,
                     Customer_Name: result.Customer_Name,
                     Email: result.Email,
                     VilfreshMoney_Limit: result.VilfreshMoney_Limit - (parseFloat(result.VilfreshCredit_Limit) - parseFloat(result.AvailableCredit_Limit))
                  });
               }
            }
         }
      });
   }
};




// Customer Status verify
exports.Customer_status_verify = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty!" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "OS Type can not be empty!" });
   } else {
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         VilFresh_Version.Vil_freshAppVersionSchema.findOne({ OS_Type: ReceivingData.Device_Type, Active_Status: true, If_Deleted: false }).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var APPVersion = Response[1];         
         if (APPVersion !== null) {
            if (CustomerDetails === null) {
               res.status(200).send({
                  Http_Code: 201, // Customer Not Registered
                  Status: true,
                  Message_Title: 'Registration',
                  Message: 'You Need to Complete Register Session First!!!...',
                  Response: CustomerDetails,
                  APPVersion: APPVersion.App_Version,
                  OS_Type: APPVersion.OS_Type
               });            
            } else if ((CustomerDetails.Customer_Status === 'Registration_completed' &&  CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Sample_Approved' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Subscription_Activated' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Sample_OnHold' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Sample_Reject' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'WaitingFor_Subscription' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Sample_Delivered' && CustomerDetails.IfApprovedBy_User === false) ||
            (CustomerDetails.Customer_Status === 'Sample_Pending' && CustomerDetails.IfApprovedBy_User === false)) {
               res.status(200).send({
                  Http_Code: 202, // Customer Registered But Sample Not Requested
                  Status: true,
                  Message_Title: 'Your Sample Request OR Subscription',
                  Message: 'You need to Sample request Or Subscription a session first!!!...',
                  CustomerId: CustomerDetails._id,
                  Mobile_Number: CustomerDetails.Mobile_Number,
                  Customer_Name: CustomerDetails.Customer_Name,
                  Email: CustomerDetails.Email,
                  APPVersion: APPVersion.App_Version,
                  OS_Type: APPVersion.OS_Type
               });
            } else if (CustomerDetails.IfApprovedBy_User === true && (
            CustomerDetails.Customer_Status === 'Sample_Approved' || CustomerDetails.Customer_Status === 'Sample_OnHold' ||
            CustomerDetails.Customer_Status === 'Sample_Reject' || CustomerDetails.Customer_Status === 'Sample_Delivered' ||
            CustomerDetails.Customer_Status === 'Sample_Pending')) {
               if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else {
                  CustomerDetails.Firebase_Token = ReceivingData.Firebase_Token;
                  CustomerDetails.Device_Type = ReceivingData.Device_Type;
                  CustomerDetails.Device_Id = ReceivingData.Device_Id;
                  CustomerDetails.save();
                  res.status(200).send({
                     Http_Code: 200, // Currently Active Customer
                     Status: true,
                     Message_Title: 'Your Account Activated',
                     Message: "Thanks For Your Subscription..Welcome to Our Vilfresh!",
                     CustomerId: CustomerDetails._id,
                     Mobile_Number: CustomerDetails.Mobile_Number,
                     Customer_Name: CustomerDetails.Customer_Name,
                     Email: CustomerDetails.Email,
                     APPVersion: APPVersion.App_Version,
                     OS_Type: APPVersion.OS_Type,
                     VilfreshMoney_Limit: CustomerDetails.VilfreshMoney_Limit - (parseFloat(CustomerDetails.VilfreshCredit_Limit) - parseFloat(CustomerDetails.AvailableCredit_Limit))
                  });
               }
            } else if (CustomerDetails.IfApprovedBy_User === true && CustomerDetails.Customer_Status === 'Approved') {
               if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else {
                  CustomerDetails.Firebase_Token = ReceivingData.Firebase_Token;
                  CustomerDetails.Device_Type = ReceivingData.Device_Type;
                  CustomerDetails.Device_Id = ReceivingData.Device_Id;
                  CustomerDetails.save();
                  res.status(200).send({
                     Http_Code: 200, // Currently Active Customer
                     Status: true,
                     Message_Title: 'Your Account Activated',
                     Message: "Thanks For Your Subscription..Welcome to Our Vilfresh!",
                     CustomerId: CustomerDetails._id,
                     Mobile_Number: CustomerDetails.Mobile_Number,
                     Customer_Name: CustomerDetails.Customer_Name,
                     Email: CustomerDetails.Email,
                     APPVersion: APPVersion.App_Version,
                     OS_Type: APPVersion.OS_Type,
                     VilfreshMoney_Limit: CustomerDetails.VilfreshMoney_Limit - (parseFloat(CustomerDetails.VilfreshCredit_Limit) - parseFloat(CustomerDetails.AvailableCredit_Limit))
                  });
               }
            } else if (CustomerDetails.IfApprovedBy_User === true && (CustomerDetails.Customer_Status === 'Subscription_Activated' || CustomerDetails.Customer_Status === 'WaitingFor_Subscription')) {
               if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
               } else {
                  CustomerDetails.Firebase_Token = ReceivingData.Firebase_Token;
                  CustomerDetails.Device_Type = ReceivingData.Device_Type;
                  CustomerDetails.Device_Id = ReceivingData.Device_Id;
                  CustomerDetails.save();
                  res.status(200).send({
                     Http_Code: 200, // Currently Active Customer
                     Status: true,
                     Message_Title: 'Your Account Activated',
                     Message: "Thanks For Your Subscription..Welcome to Our Vilfresh!",
                     CustomerId: CustomerDetails._id,
                     Mobile_Number: CustomerDetails.Mobile_Number,
                     Customer_Name: CustomerDetails.Customer_Name,
                     Email: CustomerDetails.Email,
                     APPVersion: APPVersion.App_Version,
                     OS_Type: APPVersion.OS_Type,
                     VilfreshMoney_Limit: CustomerDetails.VilfreshMoney_Limit - (parseFloat(CustomerDetails.VilfreshCredit_Limit) - parseFloat(CustomerDetails.AvailableCredit_Limit))
                  });
               }
            } else if (CustomerDetails.Customer_Status === 'InActivated') {
               res.status(200).send({
                  Http_Code: 203, //  Customer Deactivated
                  Status: true,
                  Message_Title: 'Your Account InActivated',
                  Message: "Please Contact our Vilfresh Team!",
                  CustomerId: CustomerDetails._id,
                  Mobile_Number: CustomerDetails.Mobile_Number,
                  Customer_Name: CustomerDetails.Customer_Name,
                  Email: CustomerDetails.Email,
                  APPVersion: APPVersion.App_Version,
                  OS_Type: APPVersion.OS_Type
               });
            } else {
               res.status(200).send({
                  Http_Code: 400, // Currently Active Customer
                  Status: true,
                  Message: "Some Error Occurred!",
                  CustomerId: CustomerDetails._id,
                  Mobile_Number: CustomerDetails.Mobile_Number,
                  Customer_Name: CustomerDetails.Customer_Name,                  
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



// Customer Details Create From APP
exports.Customer_From_App = function (req, res) {

   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty!" });
   } else if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Region can not be empty!" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         User_Management.UserManagementSchema.findOne({ Region: ReceivingData.Region }, {}, {})
            .populate({ path: 'Region', select: 'OdooId' })
            .exec()
      ]).then(response => {
         var Customer = response[0];
         var User = response[1];
         
         if (Customer === null) {
            ReceivingData.Special_Date = ReceivingData.Special_Date.map(obj => {
               obj.Special_Date = moment(obj.Special_Date, "DD/MM/YYYY").toDate();
               return obj;
            });

            var CustomerRegister = new Customer_Management.CustomerManagementSchema({
               Mobile_Number: ReceivingData.Mobile_Number,
               Password: '',
               Customer_Name: ReceivingData.Customer_Name || '',
               Email: ReceivingData.Email || '',
               Gender: ReceivingData.Gender || '',
               Address: ReceivingData.Address || '',
               Pincode: ReceivingData.Pincode || '',
               City: ReceivingData.City,
               Latitude: ReceivingData.Latitude || '',
               Longitude: ReceivingData.Longitude || '',
               Special_Date: ReceivingData.Special_Date || [],
               'Family_Members.Male_Count': ReceivingData.Family_Members.Male_Count || '0',
               'Family_Members.Female_Count': ReceivingData.Family_Members.Female_Count || '0',
               'Family_Members.Children_Count': ReceivingData.Family_Members.Children_Count || '0',
               'Family_Members.Infants_Count': ReceivingData.Family_Members.Infants_Count || '0',
               'Family_Members.Senior_Citizen': ReceivingData.Family_Members.Senior_Citizen || '0',
               What_You_Like: ReceivingData.What_You_Like || '',
               File_Name: "",
               Customer_Status: "Registration_completed",               
               Subscription_Activated: false,
               Morning_Subscription: 'No',
               Evening_Subscription: "No",
               Morning: [],
               Evening: [],
               Delivery_Line: null,
               CompanyId: User.CompanyId || null,
               OdooId: null,
               Region: User.Region._id || null,
               Request_Sample_Order: false,
               Choose_The_Sample_Date: null,
               Choose_The_Session: '',
               Mobile_Number_Verified: false,
               Mobile_OTP_Session: null,
               Mobile_OTP: 0,
               VilfreshMoney_Limit: 0,
               VilfreshCredit_Limit: 0,
               AvailableCredit_Limit: 0,
               Firebase_Token: ReceivingData.Firebase_Token,
               Device_Id: ReceivingData.Device_Id,
               Device_Type: ReceivingData.Device_Type,
               IfApprovedBy_User: false,
               ApprovedBy_User: User._id || null,
               Register_From: 'APP',
               IfSample_Order: false,
               Sample_From: 'From_Customer',
               QA_Analytics: [],
               Delivery_Person_QA: null,
               Active_Status: true,
               If_Deleted: false
            });
            CustomerRegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while register the Customer!", Error: err_1 });
               } else {
						DeviceManagement.TempCustomersSchema.findOne({ DeviceId: ReceivingData.Device_Id, Active_Status: true, If_Deleted: false }, {}, {})
						.exec((err_2, result_2) => {
							if (!err_2 && result_2 !== null) {
								if (result_2.Region !== null && JSON.parse(JSON.stringify(result_2.Region)) === JSON.parse(JSON.stringify(result_1.Region))) {
									DeviceManagement.TempCartSchema.find({ TempCustomer: result_2._id, Active_Status: true, If_Deleted: false }, {}, {})
									.exec((err_3, result_3) => {
										if (!err_3 && result_3.length > 0) {
											result_3 = JSON.parse(JSON.stringify(result_3));
											result_3.map(Obj => {
												var MyCartCreate = new MyCart_History.MyCartSchema({
													ProductId: Obj.ProductId,
													CustomerId: result_1._id,
													Date: Obj.Date,
													Quantity: Obj.Quantity,
													Active_Status: true,
													If_Deleted: false,
												});
												MyCartCreate.save();
											});
										}
										DeviceManagement.TempCustomersSchema.updateOne({_id: result_2._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
										DeviceManagement.TempCartSchema.updateMany({TempCustomer: result_2._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
									});
								} else {
									DeviceManagement.TempCustomersSchema.updateOne({_id: result_2._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
									DeviceManagement.TempCartSchema.updateMany({TempCustomer: result_2._id }, {$set: { Active_Status: false, If_Deleted: true }}).exec();
								}
							}
						});
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

                     const Notification = new NotificationModel.NotificationSchema({
                        User: mongoose.Types.ObjectId(result_1.ApprovedBy_User),
                        CustomerID: result_1._id,
                        DeliveryBoyID: null,
                        Notification_Type: 'NewCustomer_Registration',
                        Message: 'New Customer Registration: ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender,
                        Message_Received: false,
                        Message_Viewed: false,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Notification.save((err_2, result_2) => {
                        if (err_2) {
                           res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Notification system!", Error: err_2 });
                        } else {
                           res.status(200).send({
                              Http_Code: 200, Status: true,
                              Message: 'Registration Successfully',
                              CustomerId: result_1._id,
                              Mobile_Number: result_1.Mobile_Number
                           });
                        }
                     });
                  }).catch(function (error) {
                     console.log('Web Odoo Lead Create Error');
                  });
               }
            });
         } else {
            res.status(200).send({ Http_Code: 201, Status: true, Message: 'Already Registered' });
         }
      }).catch(error => {
         console.log(error);
         
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while register the customer!.", Error: error });
      });
   }
};

// Customer Details Create From APP
exports.Customer_From_AppRegister = function (req, res) {

   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty!" });
   } else if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Region can not be empty!" });
   } else if (!ReceivingData.Firebase_Token || ReceivingData.Firebase_Token === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else if (!ReceivingData.Device_Id || ReceivingData.Device_Id === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else if (!ReceivingData.Device_Type || ReceivingData.Device_Type === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         User_Management.UserManagementSchema.findOne({ Region: ReceivingData.Region }, {}, {})
            .populate({ path: 'Region', select: 'OdooId' })
            .exec()
      ]).then(response => {
         var Customer = response[0];
         var User = response[1];
         
         if (Customer === null) {
            ReceivingData.Special_Date = ReceivingData.Special_Date.map(obj => {
               obj.Special_Date = moment(obj.Special_Date, "DD/MM/YYYY").toDate();
               return obj;
            });

            var CustomerRegister = new Customer_Management.CustomerManagementSchema({
               Mobile_Number: ReceivingData.Mobile_Number,
               Password: '',
               Customer_Name: ReceivingData.Customer_Name || '',
               Email: ReceivingData.Email || '',
               Gender: ReceivingData.Gender || '',
               Address: ReceivingData.Address || '',
               Pincode: ReceivingData.Pincode || '',
               City: ReceivingData.City,
               Latitude: ReceivingData.Latitude || '',
               Longitude: ReceivingData.Longitude || '',
               Special_Date: ReceivingData.Special_Date || [],
               'Family_Members.Male_Count': ReceivingData.Family_Members.Male_Count || '0',
               'Family_Members.Female_Count': ReceivingData.Family_Members.Female_Count || '0',
               'Family_Members.Children_Count': ReceivingData.Family_Members.Children_Count || '0',
               'Family_Members.Infants_Count': ReceivingData.Family_Members.Infants_Count || '0',
               'Family_Members.Senior_Citizen': ReceivingData.Family_Members.Senior_Citizen || '0',
               What_You_Like: ReceivingData.What_You_Like || '',
               File_Name: "",
               Customer_Status: "Registration_completed",               
               Subscription_Activated: false,
               Morning_Subscription: 'No',
               Evening_Subscription: "No",
               Morning: [],
               Evening: [],
               Delivery_Line: null,
               CompanyId: User.CompanyId || null,
               OdooId: null,
               Region: User.Region._id || null,
               Request_Sample_Order: false,
               Choose_The_Sample_Date: null,
               Choose_The_Session: '',
               Mobile_Number_Verified: false,
               Mobile_OTP_Session: null,
               Mobile_OTP: 0,
               VilfreshMoney_Limit: 0,
               VilfreshCredit_Limit: 0,
               AvailableCredit_Limit: 0,
               Firebase_Token: ReceivingData.Firebase_Token,
               Device_Id: ReceivingData.Device_Id,
               Device_Type: ReceivingData.Device_Type,
               ApprovedBy_User: User._id || null,
               Register_From: 'APP',
               Sample_From: 'From_Customer',
               QA_Analytics: [],
               IfSample_Order: false,
               IfApprovedBy_User: false,
               Delivery_Person_QA: null,
               Active_Status: true,
               If_Deleted: false
            });
            CustomerRegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while register the Customer!", Error: err_1 });
               } else {                 
                  
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

                     const Notification = new NotificationModel.NotificationSchema({
                        User: mongoose.Types.ObjectId(result_1.ApprovedBy_User),
                        CustomerID: result_1._id,
                        DeliveryBoyID: null,
                        Notification_Type: 'NewCustomer_Registration',
                        Message: 'New Customer Registration: ' + result_1.Customer_Name + ', Mobile Number: ' + result_1.Mobile_Number + ', Gender: ' + result_1.Gender,
                        Message_Received: false,
                        Message_Viewed: false,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Notification.save();
                  }).catch(function (error) {
                     console.log('Web Odoo Lead Create Error');
                  });
                  res.status(200).send({
                     Http_Code: 200, Status: true,
                     Message: 'Registration Successfully',
                     CustomerId: result_1._id,
                     Mobile_Number: result_1.Mobile_Number
                  });
               }
            });
         } else {
            res.status(200).send({ Http_Code: 201, Status: true, Message: 'Already Registered' });
         }
      }).catch(error => {
          
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while register the customer!.", Error: error });
      });
   }
};

//Request Sample Order From Customer
exports.Request_Sample = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Sample_Date || ReceivingData.Sample_Date === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Sample Date can not be empty" });
   } else if (!ReceivingData.Session || ReceivingData.Session === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Session can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_5 });
         } else {
            if (result !== null) {
               if (result.Request_Sample_Order !== true) {
                  var SampleRes = 'Sample_Pending';
                  if ((result.Customer_Status === 'Subscription_Activated' || result.Customer_Status === 'WaitingFor_Subscription') && result.Subscription_Activated === true && result.IfApprovedBy_User === true) {
                     SampleRes = result.Customer_Status;
                  } else if (result.IfApprovedBy_User === true && result.Delivery_Line !== null) {
                     SampleRes = 'Sample_Approved';
                  }
                  Customer_Management.CustomerManagementSchema
                     .updateOne({ _id: result._id },
                        {
                           $set: {
                              Customer_Status: SampleRes,
                              Request_Sample_Order: true,
                              IfSample_Order: false,                              
                              Choose_The_Sample_Date: moment(ReceivingData.Sample_Date, "DD/MM/YYYY").toDate(),
                              Choose_The_Session: ReceivingData.Session
                           }
                        }).exec(function (err_2, result_2) {
                           if (err_2) {
                              res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: err_2 });
                           } else {
                              const SamDate = moment(ReceivingData.Sample_Date, "DD/MM/YYYY").toDate();
                              if (SampleRes === 'Sample_Pending') {
                                 axios({
                                    method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update_opportunity', data: {
                                       params: {
                                          lead_odoo_id: result.OdooId,
                                          description: 'This customer sended sample request to our Vilfresh Team on ' + moment(SamDate).format("DD/MM/YYYY")
                                       }
                                    }
                                 }).then(function (response) {
                                    const Notification = new NotificationModel.NotificationSchema({
                                       User: mongoose.Types.ObjectId(result.ApprovedBy_User),
                                       CustomerID: result._id,
                                       DeliveryBoyID: null,
                                       Notification_Type: 'CustomerSample_Pending',
                                       Message: 'customer send to sample request ' + ReceivingData.Session + 'section in ' + '& date: ' + moment(new Date()).format("DD-MM-YYYY"),
                                       Message_Received: false,
                                       Message_Viewed: false,
                                       Active_Status: true,
                                       If_Deleted: false
                                    });
                                    Notification.save();
                                 }).catch(function (error) {
                                    console.log('Web Odoo Lead Create opportunity Error');
                                 });
                              }
                              res.status(200).send({
                                 Http_Code: 200,
                                 Status: true,
                                 Message: 'Successfully Added Your Sample Request',
                                 CustomerId: result._id,
                                 Mobile_Number: result.Mobile_Number
                              });
                           }
                        });
               } else {
                  res.status(200).send({
                     Http_Code: 200,
                     Status: true,
                     Message: 'You had already sample request',
                     CustomerId: result._id,
                     Mobile_Number: result.Mobile_Number
                  });
               }
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: 'Your Account Details Invalid!' });
            }
         }
      });
   }
};


// OTP Generator Customer PIN
exports.Set_PIN_OTP_Generator = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result === null) {
               // const SendOtp = require('sendotp');
               // const sendOtp = new SendOtp('');
               // sendOtp.send("9003499510", "PRIIND", "4635", function (error, data) {
               // });
            } else {

            }
         }
      });
   }
};


// VilFresh App Customer_Login 
exports.Customer_Login = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User Name can not be empty" });
   } else if (!ReceivingData.User_Password || ReceivingData.User_Password === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User Password can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema
         .findOne({ 'Mobile_Number': ReceivingData.Mobile_Number, 'Password': ReceivingData.User_Password, 'Active_Status': true, 'If_Deleted': false }, { Password: 0 }, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, Message: "Some error occurred while Validate The User Details!." });
            } else {
               if (result !== null) {
                  if (!result.Subscription_Activated) {
                     res.status(200).send({
                        Http_Code: 201, Status: true, Message: 'You need to Subscription request a session first!!!...',
                        CustomerId: result._id,
                        Mobile_Number: result.Mobile_Number,
                        Customer_Name: result.Customer_Name
                     });
                  } else {
                     var LoginHistory = new Customer_Management.APPCustomer_LoginHistorySchema({
                        User: result._id,
                        LastActive: new Date(),
                        Active_Status: true,
                        If_Deleted: false,
                     });
                     LoginHistory.save((err_2, result_2) => {
                        if (err_2) {
                           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the User Details!" });
                        } else {
                           res.status(200).send({
                              Http_Code: 200, Status: true, Message: "Customer Login Successfully!",
                              CustomerId: result._id,
                              Mobile_Number: result.Mobile_Number,
                              Customer_Name: result.Customer_Name
                           });
                        }
                     });
                  }
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number and password do not match!" });
               }
            }
         });
   }
};


// Customer Subscription 
exports.Customer_Subscription = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (ReceivingData.Morning === [] && ReceivingData.Evening === []) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Morning & Evening can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false })
      .populate({ path: 'Region', select: 'OdooId' })
      .exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_5 });
         } else {
               if (result !== null) {
               if (result.Subscription_Activated !== true) {
                  var CustomerStatus = 'WaitingFor_Subscription';                                          
                  if (result.Delivery_Line !== null && result.IfApprovedBy_User === true) {
                     CustomerStatus = 'Subscription_Activated';
                  }
                  var Morning = [];
                  ReceivingData.Morning = ReceivingData.Morning !== undefined ? ReceivingData.Morning : [];
                  ReceivingData.Evening = ReceivingData.Evening !== undefined ? ReceivingData.Evening : [];
                  ReceivingData.Morning.map(obj => {
                     // if (obj.Liter > 0) {
                        obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                        Morning.push({
                           'ProductId': obj.ProductId,
                           'Price': obj.Price,
                           'Liter': obj.Liter
                        }); 
                     // }
                  });
                  var Evening = [];
                  ReceivingData.Evening.map(obj => {
                     // if (obj.Liter > 0) {
                        obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                        Evening.push({
                           'ProductId': obj.ProductId,
                           'Price': obj.Price,
                           "Liter": obj.Liter
                        });
                     // }
                  });
                  var MorningFilter = Morning.filter(obj => parseFloat(obj.Liter) > 0 );
                  var EveningFilter = Evening.filter(obj =>  parseFloat(obj.Liter) > 0 );
                  var Morning_Subscription = MorningFilter.length > 0 ? 'Yes' : 'No';
                  var Evening_Subscription = EveningFilter.length > 0 ? 'Yes' : 'No';
                  Customer_Management.CustomerManagementSchema
                     .updateOne({ _id: result._id },
                        {
                           $set: {
                              Morning_Subscription: Morning_Subscription,
                              Evening_Subscription: Evening_Subscription,
                              Morning: Morning,
                              Evening: Evening,
                              Subscription_Activated: true,
                              Customer_Status: CustomerStatus
                           }
                        })
                     .exec(function (err, result_1) {
                        if (err) {
                           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Customer Details!" });
                        } else {
                           res.status(200).send({
                              Http_Code: 200,
                              Status: true,
                              CustomerId: result._id,
                              Mobile_Number: result.Mobile_Number,
                              Message: 'Successfully Customer Subscription Activated'
                           });
                        }
                     });
               } else {
                  res.status(200).send({
                     Http_Code: 200,
                     CustomerId: result._id,
                     Mobile_Number: result.Mobile_Number,
                     Status: true,
                     Message: 'You had already Subscription request'
                  });
               }
            } else if(result.Customer_Status === 'InActivated') {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable....Please Contact to Vilfresh Team!" });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
};

 
// Customer Subscription Update
exports.CustomerSubscription_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (ReceivingData.Morning === [] && ReceivingData.Evening === []) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Morning & Evening can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null && result.Subscription_Activated === true) {
               var Morning = [];
               ReceivingData.Morning = ReceivingData.Morning !== undefined ? ReceivingData.Morning : [];
               ReceivingData.Evening = ReceivingData.Evening !== undefined ? ReceivingData.Evening : [];
               ReceivingData.Morning.map(obj => {
                  if (obj.ProductId !== '') {
                     obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                     Morning.push({
                        'ProductId': obj.ProductId,
                        'Price': obj.Price,
                        'Liter': obj.Liter
                     });
                  }
               });
               var Evening = [];
               ReceivingData.Evening.map(obj => {
                  if (obj.ProductId !== '') {
                     // console.log(obj);
                     obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                     Evening.push({
                        'ProductId': obj.ProductId,
                        'Price': obj.Price,
                        "Liter": obj.Liter
                     });
                  }
               });
               var MorningFilter = Morning.filter(obj =>  parseFloat(obj.Liter) > 0 );
               var EveningFilter = Evening.filter(obj =>  parseFloat(obj.Liter) > 0 );
               var Morning_Subscription = MorningFilter.length > 0 ? 'Yes' : 'No';
               var Evening_Subscription = EveningFilter.length > 0 ? 'Yes' : 'No';
               Customer_Management.CustomerManagementSchema
                  .updateOne({ _id: result._id },
                     {
                        $set: {
                           Morning_Subscription: Morning_Subscription,
                           Evening_Subscription: Evening_Subscription,
                           Morning: Morning,
                           Evening: Evening,
                        }
                     })
                  .exec(function (err_1, result_1) {
                     if (err_1) {
                        console.log(err_1);
                        res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Subscription Plan!", Error: err_3 });
                     } else {
                        res.status(200).send({
                           Http_Code: 200,
                           Status: true,
                           CustomerId: result._id,
                           Mobile_Number: result.Mobile_Number,
                           Message: 'Successfully Customer Subscription Activated'
                        });
                     }
                  });
            } else if (result.Customer_Status === 'InActivated') {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable....Please Contact to Vilfresh Team" });
            } else {
               if (result !== null) {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Subscription Activation Check Failed" });
               }
            }
         }
      });
   }
};


// Customer Subscription Pause
exports.CustomerSubscription_Pause = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null && result.Subscription_Activated === true) {
               var Morning = JSON.parse(JSON.stringify(result.Morning));
               result.Morning= result.Morning.map(obj => {
                  obj.Liter = 0;
                  return obj;
               });
               var Evening = JSON.parse(JSON.stringify(result.Evening));
               result.Evening = result.Evening.map(obj => {
                  obj.Liter = 0;
                  return obj;
               });
               var CustomerStatus = 'Registration_completed';
               if (result.IfApprovedBy_User === true) {
                  CustomerStatus = 'Approved';
               }
               Customer_Management.CustomerManagementSchema
                  .updateOne({ _id: result._id },
                     {
                        $set: {
                           Morning_Subscription: 'No',
                           Evening_Subscription: 'No',
                           Subscription_Activated: false,
                           Customer_Status: CustomerStatus,
                           Morning: result.Morning,
                           Evening: result.Evening,
                           PauseDataIn_Morning: Morning,
                           PauseDataIn_Evening: Evening,
                           SubscriptionPaused: true,
                        }
                     })
                  .exec(function (err_1, result_1) {
                     if (err_1) {
                        res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Subscription Plan!", Error: err_3 });
                     } else {
                        res.status(200).send({
                           Http_Code: 200,
                           Status: true,
                           CustomerId: result._id,
                           Mobile_Number: result.Mobile_Number,
                           Message: 'Successfully Customer Subscription Paused'
                        });
                     }
                  });
            } else if (result.Customer_Status === 'InActivated') {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable....Please Contact to Vilfresh Team" });
            } else {
               if (result !== null) {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Subscription Activation Check Failed" });
               }
            }
         }
      });
   }
};


// Customer Subscription Resume
exports.CustomerSubscription_Resume = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (ReceivingData.Morning === [] && ReceivingData.Evening === []) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Morning & Evening can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null && result.SubscriptionPaused === true ) {
               var Morning = [];
               ReceivingData.Morning = ReceivingData.Morning !== undefined ? ReceivingData.Morning : [];
               ReceivingData.Evening = ReceivingData.Evening !== undefined ? ReceivingData.Evening : [];
               ReceivingData.Morning.map(obj => {
                  if (obj.ProductId !== '') {
                     obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                     Morning.push({
                        'ProductId': obj.ProductId,
                        'Price': obj.Price,
                        'Liter': obj.Liter
                     });
                  }
               });
               var Evening = [];
               ReceivingData.Evening.map(obj => {
                  if (obj.ProductId !== '') {
                     obj.ProductId = mongoose.Types.ObjectId(obj.ProductId);
                     Evening.push({
                        'ProductId': obj.ProductId,
                        'Price': obj.Price,
                        "Liter": obj.Liter
                     });
                  }
               });
               var MorningFilter = Morning.filter(obj =>  parseFloat(obj.Liter) > 0 );
               var EveningFilter = Evening.filter(obj =>  parseFloat(obj.Liter) > 0 );
               var Morning_Subscription = MorningFilter.length > 0 ? 'Yes' : 'No';
               var Evening_Subscription = EveningFilter.length > 0 ? 'Yes' : 'No';
               var CustomerStatus = 'WaitingFor_Subscription';
               if (result.IfApprovedBy_User === true) {
                  CustomerStatus = 'Subscription_Activated';
               }
               Customer_Management.CustomerManagementSchema
                  .updateOne({ _id: result._id },
                     {
                        $set: {
                           Morning_Subscription: Morning_Subscription,
                           Evening_Subscription: Evening_Subscription,
                           Subscription_Activated: true,
                           Customer_Status: CustomerStatus,
                           Morning: Morning,
                           Evening: Evening,
                           PauseDataIn_Morning: [],
                           PauseDataIn_Evening: [],
                           SubscriptionPaused: false,
                        }
                     })
                  .exec(function (err_1, result_1) {
                     if (err_1) {
                        console.log(err_1);
                        res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Resume the Subscription Plan!", Error: err_3 });
                     } else {
                        res.status(200).send({
                           Http_Code: 200,
                           Status: true,
                           CustomerId: result._id,
                           Mobile_Number: result.Mobile_Number,
                           Message: 'Successfully Customer Subscription Resumed'
                        });
                     }
                  });
            } else if (result.Customer_Status === 'InActivated') {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable....Please Contact to Vilfresh Team" });
            } else {
               if (result !== null) {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Subscription Resuming Check Failed" });
               }
            }
         }
      });
   }
};

// Customer Details view
exports.CustomerDetails_Edit = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "Customer Details can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.CustomerId) }, {}, {})
         .populate({ path: "Morning.ProductId", select: ['Type', 'BasicUnitQuantity', 'Price'] })
         .populate({ path: "Evening.ProductId", select: ['Type', 'BasicUnitQuantity', 'Price'] })
         .populate({ path: "PauseDataIn_Morning.ProductId", select: ['Type', 'BasicUnitQuantity', 'Price'] })
         .populate({ path: "PauseDataIn_Evening.ProductId", select: ['Type', 'BasicUnitQuantity', 'Price'] })
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Details!.", Error: err });
            } else {
               if (result !== null) {
                  result = JSON.parse(JSON.stringify(result));
                  result.Morning = result.Morning.map(obj => {
                     obj.Type = obj.ProductId.Type;
                     obj.UnitPrice = obj.ProductId.Price;
                     obj.BasicUnitQuantity = obj.ProductId.BasicUnitQuantity;
                     obj.ProductId = obj.ProductId._id;
                     obj.Price = (obj.Liter / obj.BasicUnitQuantity) * obj.UnitPrice;
                     return obj;
                  });
                  result.Evening = result.Evening.map(obj => {
                     obj.Type = obj.ProductId.Type;
                     obj.UnitPrice = obj.ProductId.Price;
                     obj.BasicUnitQuantity = obj.ProductId.BasicUnitQuantity;
                     obj.ProductId = obj.ProductId._id;
                     obj.Price = (obj.Liter / obj.BasicUnitQuantity) * obj.UnitPrice;
                     return obj;
                  });
                  if (result.SubscriptionPaused === true && result.PauseDataIn_Morning !== undefined) {
                     result.PauseDataIn_Morning = result.PauseDataIn_Morning.map(obj => {
                        obj.Type = obj.ProductId.Type;
                        obj.UnitPrice = obj.ProductId.Price;
                        obj.BasicUnitQuantity = obj.ProductId.BasicUnitQuantity;
                        obj.ProductId = obj.ProductId._id;
                        obj.Price = (obj.Liter / obj.BasicUnitQuantity) * obj.UnitPrice;
                        return obj;
                     });
                  }
                  if (result.SubscriptionPaused === true && result.PauseDataIn_Evening !== undefined) {
                     result.PauseDataIn_Evening = result.PauseDataIn_Evening.map(obj => {
                        obj.Type = obj.ProductId.Type;
                        obj.UnitPrice = obj.ProductId.Price;
                        obj.BasicUnitQuantity = obj.ProductId.BasicUnitQuantity;
                        obj.ProductId = obj.ProductId._id;
                        obj.Price = (obj.Liter / obj.BasicUnitQuantity) * obj.UnitPrice;
                        return obj;
                     });
                  }
                  result.PauseDataIn_Morning = result.PauseDataIn_Morning !== undefined ? result.PauseDataIn_Morning : [];
                  result.PauseDataIn_Evening = result.PauseDataIn_Evening !== undefined ? result.PauseDataIn_Evening : [];
                  result.SubscriptionPaused = result.SubscriptionPaused !== undefined ? result.SubscriptionPaused : false;
						result.Special_Date = result.Special_Date.map(obj => {
							if (obj.Special_Date && obj.Special_Date !== '' && obj.Special_Date !== null) {
								obj.Special_Date =  moment(obj.Special_Date).format("YYYY-MM-DDTHH:mm:ss");
							}
							return obj;
						});
						res.status(200).send({ Http_Code: 200, Status: true, Response: result });
               } else {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
               }
            }
         });
   }
};


// Customer Details Update
exports.Customer_Detail_Updated = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               ReceivingData.Special_Date = ReceivingData.Special_Date.map(obj => {
                  obj.Special_Date = moment(new Date(obj.Special_Date), "DD/MM/YYYY").toDate();
                  return obj;
               });
               result.Customer_Name = ReceivingData.Customer_Name;
               result.Email = ReceivingData.Email;
               result.Family_Members.Male_Count = ReceivingData.Family_Members.Male_Count || '0';
               result.Family_Members.Female_Count = ReceivingData.Family_Members.Female_Count || '0';
               result.Family_Members.Children_Count = ReceivingData.Family_Members.Children_Count || '0';
               result.Family_Members.Infants_Count = ReceivingData.Family_Members.Infants_Count || '0';
               result.Family_Members.Senior_Citizen = ReceivingData.Family_Members.Senior_Citizen || '0';
               result.Special_Date = [];
               result.Special_Date = ReceivingData.Special_Date;
               Promise.all([
                  result.save(),
                  RegionManagement.RegionManagementSchema.findOne({ _id: result.Region, Active_Status: true, If_Deleted: false }, {}, {}).exec()
               ]).then(response => {
                  var CustomerDetails = response[0];
                  var RegionData = response[1];
                  if ( result.Customer_Status === 'Approved' || result.Customer_Status === 'Sample_Approved' || result.Customer_Status === 'Subscription_Activated' || result.Customer_Status === 'InActivated' ) {
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
                           "category_count": ReceivingData.Family_Members.Male_Count,
                        },
                        {
                           "name": 'Female',
                           "category_count": ReceivingData.Family_Members.Female_Count,
                        },
                        {
                           "name": "Children",
                           "category_count": ReceivingData.Family_Members.Children_Count
                        },
                        {
                           "name": "Infants",
                           "category_count": ReceivingData.Family_Members.Infants_Count
                        },
                        {
                           "name": "Senior_Citizen",
                           "category_count": ReceivingData.Family_Members.Senior_Citizen
                        }
                     );

                     axios({
                        method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update', data: {
                           params: {
                              name: ReceivingData.Customer_Name,
                              mobile: result.Mobile_Number,
                              email: ReceivingData.Email,
                              gender: result.Gender,
                              street: result.Address,
                              special_date_ids: Special_Day,
                              family_ids: Family_Count,
                              food_interest: result.What_You_Like,
                              city: result.City,
                              customer_odoo_id: result.OdooId,
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
                              lead_odoo_id: result.OdooId,
                              email_from: ReceivingData.Email,
                              name: ReceivingData.Customer_Name
                           }
                        }
                     }).then(function (response) {
                     }).catch(function (error) {
                        console.log('Odoo Lead details Updated Error');
                     });
                  }
                  res.status(200).send({ Http_Code: 200, Status: true, Message: "SuccessFully Customer Details Updated", Customer_Name: CustomerDetails.Customer_Name });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Customer Details!" });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};



// Customer Update Set Password-------------------------------
exports.Customer_Update_Set_Password = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Pin || ReceivingData.Pin === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Pin Number can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_5 });
         } else {
            if (result !== null) {
               result.Password = ReceivingData.Pin;
               // result.Customer_Status = "WaitingFor_Subscription";
               result.save((err_2, result_2) => {
                  if (err_2) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Customer Details!" });
                  } else {
                     const Notification = new NotificationModel.NotificationSchema({
                        User: mongoose.Types.ObjectId(result.ApprovedBy_User),
                        CustomerID: result._id,
                        DeliveryBoyID: null,
                        Notification_Type: 'CustomerWaitingFor_Subscription',
                        Message: 'Waiting Subscription for Customer : ' + result.Customer_Name + ', Mobile Number: ' + result.Mobile_Number + ', Gender: ' + result.Gender,
                        Message_Received: false,
                        Message_Viewed: false,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Notification.save((err_3, result_3) => {
                        if (err_3) {
                           res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Notification system!", Error: err_3 });
                        } else {
                           res.status(200).send({
                              Http_Code: 200, Status: true, Message: "SuccessFully Updated for Password",
                              CustomerId: result._id,
                              Mobile_Number: result.Mobile_Number,
                              Customer_Name: result.Customer_Name
                           });
                        }
                     });
                  }
               });

            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
};



// Mobile Number Change OTP Generate
exports.MobileNumberChange_OTP = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result === null) {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "OTP Sent SuccessFully" });
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "This Mobile Number Already in Another Account!" });
            }
         }
      });
   }
};


// Mobile Number Change
exports.MobileNumber_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec((error, response) => {
                  if (error) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
                  } else {
                     if (response !== null) {
                        res.status(200).send({ Http_Code: 409, Status: false, Message: "This Mobile Number Already Exists" });
                     } else {
                        result.Mobile_Number = ReceivingData.Mobile_Number;

                        Promise.all([
                           result.save(),
                           RegionManagement.RegionManagementSchema.findOne({ _id: result.Region, Active_Status: true, If_Deleted: false }, {}, {}).exec()
                        ]).then(response => {
                           var RegionData = response[1];
                           if ( result.Customer_Status === 'Approved' || result.Customer_Status === 'Sample_Approved' || result.Customer_Status === 'Subscription_Activated' || result.Customer_Status === 'InActivated' ) {
                              var Special_Day = [];
                              var Family_Count = [];
                              result.Special_Date.map(obj => {
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
                                 method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update', data: {
                                    params: {
                                       name: result.Customer_Name,
                                       mobile: ReceivingData.Mobile_Number,
                                       email: result.Email,
                                       gender: result.Gender,
                                       street: result.Address,
                                       special_date_ids: Special_Day,
                                       family_ids: Family_Count,
                                       food_interest: result.What_You_Like,
                                       city: result.City,
                                       customer_odoo_id: result.OdooId,
                                       region_id: RegionData.OdooId
                                    }
                                 }
                              }).then(function (response_1) {
                              }).catch(function (error) {
                                 console.log('Odoo lead Customer details Updated Error');
                              });
                           } else {
                              axios({
                                 method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update', data: {
                                    params: {
                                       lead_odoo_id: result.OdooId,
                                       mobile: ReceivingData.Mobile_Number,
                                       name: ReceivingData.Customer_Name
                                    }
                                 }
                              }).then(function (response) {
                              }).catch(function (error) {
                                 console.log('Odoo Lead details Updated Error');
                              });
                           }
                           res.status(200).send({ Http_Code: 200, Status: true, Message: "SuccessFully Mobile Number Updated" });
                        }).catch(error => {
                           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Customer Details!" });
                        });
                     }
                  }
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
            }
         }
      });
   }
};


// Customer Logout
exports.Customer_LogOut = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.APPCustomer_LoginHistorySchema
         .updateOne({ User: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { $set: { Active_Status: false } })
         .exec(function (err, result_1) {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "User Successfully Logout" });
            }
         });
   }
};


// Forgot OTP Verify
exports.Forgot_OTP_Verify = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
   } else if (Forgot_OTpVerify !== ReceivingData.OTP_Number) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "OTP Number Incorrect" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Forgot OTP Matched!!!...', CustomerId: result._id, Mobile_Number: result.Mobile_Number });
         }
      });
   }
};


// Customer Details Updated
exports.Customer_details_Updated = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === "") {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec((err_5, result) => {
         if (err_5) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details----!.", Error: err_5 });
         } else {
            if (result !== null) {
               result.Mobile_Number = ReceivingData.Mobile_Number || '';
               result.Address = ReceivingData.Address || '';
               result.Latitude = ReceivingData.Latitude || '';
               result.Longitude = ReceivingData.Longitude || '';

               Promise.all([
                  result.save(),
                  RegionManagement.RegionManagementSchema.findOne({ _id: result.Region, Active_Status: true, If_Deleted: false }, {}, {}).exec()
               ]).then(response => {
                  var RegionData = response[1];
                  if ( result.Customer_Status === 'Approved' || result.Customer_Status === 'Sample_Approved' || result.Customer_Status === 'Subscription_Activated' || result.Customer_Status === 'InActivated' ) {
                     var Special_Day = [];
                     var Family_Count = [];
                     result.Special_Date.map(obj => {
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
                        method: 'get', url: 'https://www.vilfresh.in/api/res_partner/update', data: {
                           params: {
                              name: result.Customer_Name,
                              mobile: ReceivingData.Mobile_Number,
                              email: result.Email,
                              gender: result.Gender,
                              street: ReceivingData.Address,
                              special_date_ids: Special_Day,
                              family_ids: Family_Count,
                              food_interest: result.What_You_Like,
                              city: result.City,
                              customer_odoo_id: result.OdooId,
                              region_id: RegionData.OdooId
                           }
                        }
                     }).then(function (response_1) {
                     }).catch(function (error) {
                        console.log('Odoo lead Customer details Updated Error');
                     });
                  }  else {
                     axios({
                        method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update', data: {
                           params: {
                              lead_odoo_id: result.OdooId,
                              mobile: ReceivingData.Mobile_Number,
                              street: ReceivingData.Address,
                              name: ReceivingData.Customer_Name
                           }
                        }
                     }).then(function (response) {
                     }).catch(function (error) {
                        console.log('Odoo Lead details Updated Error');
                     });
                  }
                  res.status(200).send({
                     Http_Code: 200, Status: true, Message: "SuccessFully Customer Details Updated",
                     CustomerId: result._id,
                     Mobile_Number: result.Mobile_Number,
                     Customer_Name: result.Customer_Name
                  });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Customer Details!" });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
};

// Customer image upload--------------------------------
exports.Customer_Image_Upload = function (req, res) {

   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === "") {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Customer_Image || ReceivingData.Customer_Image === "") {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Image can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec((err_5, result) => {
         if (err_5) {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details----!.", Error: err_5 });
         } else {
            if (result !== null) {
               if (ReceivingData.Customer_Image) {
                  var reportData = ReceivingData.Customer_Image.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                  var buff = Buffer.from(reportData, 'base64');
                  const fineName = 'Uploads/Customer_File/' + result._id + '.png';
                  result.File_Name = result._id + '.png';
                  var FileName = result.File_Name;
                  Customer_Management.CustomerManagementSchema.updateOne({ _id: ReceivingData.CustomerId }, { File_Name: FileName }).exec();
                  fs.writeFileSync(fineName, buff);
                  res.status(200).send({ Http_Code: 200, Status: true, Message: "Customer Image SuccessFully Updated!" });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
};


// Customer Daily Subscription Management
exports.Daily_Subscription_Details = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Subscription_Activated: true }, { Morning: 1, Evening: 1 }, {}).
         populate({ path: "Morning.ProductId", select: 'Type' }).populate({ path: "Evening.ProductId", select: 'Type' }).exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
            } else {
               if (result !== null) {
                  result = JSON.parse(JSON.stringify(result));
                  var Morning = [];
                  var Evening = [];
                  var MorningArray = result.Morning;
                  var EveningArray = result.Evening;
                  if (result.Morning.length > 0) {
                     result.Morning = result.Morning.map(obj => {
                        if (obj.Liter > 0) {
                           delete obj._id;
                           delete obj.Price;
                           obj.Product_Id = obj.ProductId._id;
                           obj.Type = obj.ProductId.Type;
                           delete obj.ProductId;
                           obj.Status = true;
                           obj.Visible = true;
                           return obj;
                        } else {
                           delete obj._id;
                           delete obj.Price;
                           obj.Product_Id = obj.ProductId._id;
                           obj.Type = obj.ProductId.Type;
                           delete obj.ProductId;
                           obj.Status = false;
                           obj.Visible = true;
                           return obj;
                        }
                     });
                     Morning = result.Morning;
                     if (Morning.length === 1) {
                        const Already = MorningArray[0].Product_Id;
                        const FilterSub = MorningArray.filter(obj => obj.Product_Id !== Already);
                     }
                  } else {
                     MorningArray.map(obj => Morning.push(obj));
                  }

                  if (result.Evening.length > 0) {
                     result.Evening = result.Evening.map(obj => {

                        if (obj.Liter > 0) {
                           delete obj._id;
                           delete obj.Price;
                           obj.Product_Id = obj.ProductId._id;
                           obj.Type = obj.ProductId.Type;
                           delete obj.ProductId;
                           obj.Status = true;
                           obj.Visible = true;
                           return obj;
                        } else {
                           delete obj._id;
                           delete obj.Price;
                           obj.Product_Id = obj.ProductId._id;
                           obj.Type = obj.ProductId.Type;
                           delete obj.ProductId;
                           obj.Status = false;
                           obj.Visible = true;
                           return obj;
                        }
                     });
                     Evening = result.Evening;
                     if (Evening.length === 1) {
                        const Already = EveningArray[0].Product_Id;
                        const FilterSub = EveningArray.filter(obj => obj.Product_Id !== Already);
                        if (FilterSub.length !== 0) {
                        }
                     }
                  } else {
                     EveningArray.map(obj => Evening.push(obj));
                  }
                  var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));
						var Today = new Date(new Date().setHours(0, 0, 0, 0));
						let LengthArray = Array.apply(null, Array(10)).map((val, idx) => idx + 1);
                  if (new Date().getHours() < 12) {
							LengthArray.splice(0, 0, 0);
							LengthArray.pop();
                     // CurrentDate = new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0));
                  }
                  var SubscriptionArray = [];
                  LengthArray.map(obj => {
                     const TempDate = new Date(new Date(CurrentDate).setDate(CurrentDate.getDate() + obj));
							var NewMorning = [];
							Morning.map(ObjOne => {
								const NewObj = Object.assign({}, ObjOne);
								if (TempDate.valueOf() === Today.valueOf()) {
									NewObj.Visible = false;
								}
								NewMorning.push(NewObj);
							});
							
                     const SubscriptionData = { Date: moment(TempDate).format("YYYY-MM-DD"), TempDate: TempDate, Morning: NewMorning, Evening: Evening };
                     SubscriptionArray.push(SubscriptionData);
                  });
                  Promise.all(
                     SubscriptionArray.map(obj => {
                        return Customer_Management.Subscription_ManagementSchema.findOne({ Customer: ReceivingData.CustomerId, SubscriptionDate: obj.TempDate, Active_Status: true }, {}, {}).
                           populate({ path: 'Morning.ProductId', select: 'Type' }).populate({ path: 'Evening.ProductId', select: 'Type' }).exec();
                     })
                  ).then(response => {
                     response = JSON.parse(JSON.stringify(response));
                     response.map((obj, idx) => {
                        if (obj !== null) {
                           obj.Morning = obj.Morning.map(obj1 => {
                              if (obj1.Liter > 0) {
                                 delete obj1._id;
                                 obj1.Product_Id = obj1.ProductId._id;
                                 obj1.Type = obj1.ProductId.Type;
                                 delete obj1.ProductId;
											if (new Date(obj.SubscriptionDate).valueOf() === Today.valueOf() ) {
												obj1.Visible = false;
											} else {
												obj1.Visible = true;
											}

                                 return obj1;
                              } else {
                                 delete obj1._id;
                                 obj1.Product_Id = obj1.ProductId._id;
                                 obj1.Type = obj1.ProductId.Type;
                                 delete obj1.ProductId;
                                 obj1.Status = false;
											if (new Date(obj.SubscriptionDate).valueOf() === Today.valueOf() ) {
												obj1.Visible = false;
											} else {
                                 	obj1.Visible = true;
											}
                                 return obj1;
                              }
                           });

                           obj.Evening = obj.Evening.map(obj2 => {
                              if (obj2.Liter > 0) {
                                 delete obj2._id;
                                 obj2.Product_Id = obj2.ProductId._id;
                                 obj2.Type = obj2.ProductId.Type;
                                 delete obj2.ProductId;
                                 if (obj2.Status === false) {
                                    obj2.Status = false;
                                    obj2.Visible = true;
                                 } else {
                                    obj2.Status = true;
                                    obj2.Visible = true;
                                 }
                                 return obj2;
                              } else {
                                 delete obj2._id;
                                 delete obj2.Price;
                                 obj2.Product_Id = obj2.ProductId._id;
                                 obj2.Type = obj2.ProductId.Type;
                                 delete obj2.ProductId;
                                 obj2.Status = false;
                                 obj2.Visible = true;
                                 return obj2;
                              }
                           });
                           SubscriptionArray[idx].Morning = obj.Morning;
                           SubscriptionArray[idx].Evening = obj.Evening;
                        }
                     });
                     SubscriptionArray = SubscriptionArray.map(obj => { delete obj.TempDate; return obj; });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Customer Daily Subscription Details", Response: SubscriptionArray });
                  }).catch(error => {
                     res.status(417).send({ Http_Code: 417, Status: true, Message: "Some Error Occurred!", Error: error });
                  });

               } else {
                  res.status(200).send({ Http_Code: 400, Status: true, Message: "Invalid Customer Details!" });
               }
            }
         });
   }
};


// Customer Daily Subscription Management
exports.Daily_Subscription_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Date || ReceivingData.Date === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Subscription Date can not be empty" });
   } else if (!ReceivingData.Session || ReceivingData.Session === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Subscription Session can not be empty" });
   } else if (!ReceivingData.ProductId || ReceivingData.ProductId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Subscription Milk Type can not be empty" });
   } else if (!ReceivingData.Liter || ReceivingData.Liter === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Subscription Milk Liter can not be empty" });
   } else if (ReceivingData.Status === undefined || ReceivingData.Status === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Subscription Status can not be empty" });
   } else {

      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "DD/MM/YYYY").toDate().toISOString();

      // console.log(ReceivingData);
      
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Subscription_Activated: true }, {}, {}).exec(),
         Customer_Management.Subscription_ManagementSchema.findOne({ Customer: ReceivingData.CustomerId, SubscriptionDate: ReceivingData.Date, Active_Status: true }, {}, {}).exec()
      ]).then(response => {
         var Customer = response[0];
         var Existing_Subscription = response[1];
         if (Customer !== null) {
            if (Existing_Subscription !== null) {
               const idx = Existing_Subscription[ReceivingData.Session].findIndex(obj => obj.ProductId.toString() === ReceivingData.ProductId);
               Existing_Subscription[ReceivingData.Session][idx].Liter = ReceivingData.Liter;
               Existing_Subscription[ReceivingData.Session][idx].Status = ReceivingData.Status;
               Existing_Subscription.save((err, result) => {
                  if (err) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update The Customer Subscription Details!.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Subscription Details Successfully Updated!" });
                  }
               });
            } else {
               Customer = JSON.parse(JSON.stringify(Customer));
               const new_Subscription = { Morning: [], Evening: [] };

               if (Customer.Morning.length > 0) {
                  Customer.Morning.map(obj => {
                     obj.Status = false;
                     new_Subscription.Morning.push(obj);
                  });
               }

               if (Customer.Evening.length > 0) {
                  Customer.Evening.map(obj => {
                     obj.Status = false;
                     new_Subscription.Evening.push(obj);

                  });
               }


               if (Customer.Morning.length > 0) {
                  Customer.Morning.map(obj => {
                     const idx = new_Subscription.Morning.findIndex(obj1 => obj1.ProductId === obj.ProductId);
                     new_Subscription.Morning[idx].Liter = obj.Liter;
                     new_Subscription.Morning[idx].Status = true;
                  });
               }
               if (Customer.Evening.length > 0) {
                  Customer.Evening.map(obj => {
                     const idx = new_Subscription.Evening.findIndex(obj1 => obj1.ProductId === obj.ProductId);
                     new_Subscription.Evening[idx].Liter = obj.Liter;
                     new_Subscription.Evening[idx].Status = true;
                  });
               }
               const idx = new_Subscription[ReceivingData.Session].findIndex(obj => obj.ProductId.toString() === ReceivingData.ProductId);
               new_Subscription[ReceivingData.Session][idx].Liter = ReceivingData.Liter;
               new_Subscription[ReceivingData.Session][idx].Status = ReceivingData.Status;
               var CustomerSubscription_Management = new Customer_Management.Subscription_ManagementSchema({
                  Customer: ReceivingData.CustomerId,
                  Morning: new_Subscription.Morning,
                  Evening: new_Subscription.Evening,
                  SubscriptionDate: ReceivingData.Date,
                  Region: Customer.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               CustomerSubscription_Management.save((err, result) => {
                  if (err) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update The Customer Subscription Details!.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Subscription Details Successfully Added!" });
                  }
               });
            }
         } else if (Customer.Customer_Status === 'InActivated') {
            res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable.....Please Contact to Vilfresh Team!!!" });
         } else {
            res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: error });
      });
   }
};

// Dynamic Changed Milk Product ------------------------

exports.MilkProduct_Subscription = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "CustomerId can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {})
      .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 400, Status: false, Message: "Some Error Occurred for find Customer Details!" });
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
                        res.status(200).send({
                           Http_Code: 200,
                           Status: true,
                           Message: "Subscription Details!",
                           Morning: Morning,
                           Evening: Evening
                        });
                     } else {
                        res.status(417).send({ Http_Code: 400, Status: false, Message: "Product Details is Empty!" });
                     }
                  }
               });
            } else {
               res.status(417).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
};

// Direct Sample Create By Delivery Person 
exports.Direct_Sample = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "User can not be empty!" });
   } else if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Mobile Number is required field!" });
   } else if (!ReceivingData.Customer_Name || ReceivingData.Customer_Name === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Name is required field" });
   } else {
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number, Active_Status: true, If_Deleted: false }).exec(),
         DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.User }, {}, {}).populate('Region').exec(),
         ProductManagement.ProductManagementSchema.findOne( { Milk_YesOrNo: true, Type: "A1", Active_Status: true }, { Product_Name: 1, BasicUnitQuantity: 1, Price: 1, Unit: 1 }, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec()
      ]).then(response => {
         var Customer = response[0];
         var User = response[1];
         var SampleDate = new Date();
         var Sample_Date =  moment(SampleDate, "DD-MM-YYYY").toDate();
         if (Customer === null) {
            var CustomerRegister = new Customer_Management.CustomerManagementSchema({
               Mobile_Number: ReceivingData.Mobile_Number,
               Password: '',
               Customer_Name: ReceivingData.Customer_Name || '',
               Email: ReceivingData.Email || '',
               Gender: ReceivingData.Gender || '',
               Address: ReceivingData.Address || '',
               Sample_From: 'From_DeliveryBoy',
               City: '',
               Latitude: '',
               Longitude: '',
               Special_Date: [],
               'Family_Members.Male_Count': '0',
               'Family_Members.Female_Count': '0',
               'Family_Members.Children_Count': '0',
               'Family_Members.Infants_Count': '0',
               'Family_Members.Senior_Citizen': '0',
               What_You_Like: ReceivingData.What_You_Like || '',
               File_Name: "",
               Customer_Status: "Sample_Approved",
               IfSample_Order: true,
               Subscription_Activated: false,
               Morning_Subscription: 'No',
               Evening_Subscription: "No",
               Morning: [],
               Evening: [],
               Delivery_Line: mongoose.Types.ObjectId(User.DeliveryLine),
               CompanyId: User.Region.CompanyId || null,
               OdooId: null,
               Region: User.Region._id || null,
               Request_Sample_Order: true,
               Choose_The_Sample_Date: Sample_Date,
               Choose_The_Session: ReceivingData.Choose_The_Session || '',
               Mobile_Number_Verified: false,
               Mobile_OTP_Session: null,
               Mobile_OTP: 0,
               VilfreshMoney_Limit: 0,
               VilfreshCredit_Limit: 0,
               AvailableCredit_Limit: 0,
               Firebase_Token: '',
               Device_Id: '',
               Device_Type: '',
               ApprovedBy_User: ReceivingData.User || null,
               IfApprovedBy_User: true,
               Register_From: 'APP',
               QA_Analytics: [],
               Delivery_Person_QA: null,
               Active_Status: true,
               If_Deleted: false,
            });
            CustomerRegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while register the Customer!", Error: err_1 });
               } else {
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
                  }).then(function (responseLead) {
                     result_1.OdooId = responseLead.data.result.lead_id;
                     const SampleDate = moment(result_1.createdAt, "DD/MM/YYYY").toDate();                     
                    result_1.save();
                     axios({
                        method: 'get', url: 'https://www.vilfresh.in/api/crm_lead/update_opportunity', data: {
                           params: {
                              lead_odoo_id: result_1.OdooId,
                              description: 'This customer sended sample delivered to our Vilfresh Team on ' + moment(SampleDate).format("DD/MM/YYYY")
                           }
                        }
                     });
                  }).catch(function (error) {
                     console.log('Web Odoo Lead Create Error');
                  });       
                  var SampleMilk = JSON.parse(JSON.stringify(response[2]));
                  var LastOrder = JSON.parse(JSON.stringify(response[3]));

                  var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;

                  const NewId = mongoose.Types.ObjectId();
                  const Product = {
                     ProductId: mongoose.Types.ObjectId(SampleMilk._id),
                     FromCart: null,
                     Quantity: 0.5,
                     BasicUnitQuantity: SampleMilk.BasicUnitQuantity,
                     Unit_Price: SampleMilk.Price,
                     Total_Amount: SampleMilk.Price * 0.5,
                  };

                  const Create_Order = new OrderManagement.OrderSchema({
                     _id: NewId,
                     CustomerId: mongoose.Types.ObjectId(result_1._id),
                     FromBasket: null,
                     Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                     Order_Unique: LastOrder_Reference,
                     Order_Type: 'Sample_From',
                     Item_Details: [Product],
                     Item_Counts: 1,
                     Payable_Amount: 0,
                     Payment_Status: 'Paid', // Paid , UnPaid
                     Payment_Type: 'Wallet', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                     If_Partial: false,
                     ReduceFrom_Wallet: 0,
                     ReduceFrom_Online: 0,
                     ReduceFrom_Credit: 0,
                     DeliveryDate: result_1.createdAt,
                     Region: result_1.Region,
                     OrderConfirmed: true,
                     OrderConfirmedBy: ReceivingData.User,
                     OrderDelivered: true,
                     DeliveryPerson: ReceivingData.User,
                     Active_Status: true,
                     If_Deleted: false
                  });

                  Create_Order.save((err_2, result_2) => {
                     if (err_2) {
                        res.status(417).send({ Http_Code: 418, Status: false, Message: "Some error occurred while generating order!", Error: err_2 });
                     } else {
                        res.status(200).send({ Http_Code: 200, Status: true, Message: 'Sample Order Generated Successfully' });
                     }
                  });
               }
            });
         } else {
            res.status(200).send({ Http_Code: 201, Status: true, Message: 'Already Registered' });
         }
      }).catch(error => {
         res.status(417).send({ Status: false, Message: "Some error occurred while creating direct sample for this customer!.", Error: error });
      });
   }

};


// Direct Sample Request List
exports.Direct_Sample_List = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(200).send({ Status: false, Http_Code: 400, Message: "User Details can not be empty" });
   } else {
      DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Sample Details!.", Error: err });
         } else {
            if (result !== null) {
               Customer_Management.DirectSample_ManagementSchema.find({ CreatedBy_User: ReceivingData.User }, { Customer_Name: 1, Mobile_Number: 1, Sample_Date: 1 }, { 'short': { createdAt: 1 } }).exec(function (err, result) {
                  if (err) {
                     res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err });
                  } else {
                     res.status(200).send({ Status: true, Response: result });
                  }
               });
            } else {
               res.status(200).send({ Http_Code: 400, Success: false, Message: "No Requesting Sample Customer !.." });
            }
         }
      });
   }
};


exports.QA_List = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);   

   if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
      res.status(200).send({ Status: false, Http_Code: 400, Message: "Deliveryboy Details can not be empty" });
   } else {
      DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery person Details!.", Error: err });
         } else {
            if (result !== null) {
               var Region = mongoose.Types.ObjectId(result.Region);

               Customer_Management.QAManagementSchema.find({ Region: Region, Active_Status: true, If_Deleted: false  }, { Question: 1, Answer: 1 }, { 'short': { createdAt: 1 } }).exec(function (err, result) {
                  if (err) {
                     res.status(417).send({Http_Code: 400,  status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Response: result  });
                  }
               });
            } else {
               res.status(200).send({ Http_Code: 400, Success: false, Message: "No QA list !.." });
            }
         }
      });
   }

}; 


// Delivery boy updating QA Analytics
exports.DeliveryBoy_QARequest = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.QuestionId || ReceivingData.QuestionId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "QuestionId can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0 ) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Products can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var Config_Date = moment(ReceivingData.Config_Date, "DD-MM-YYYY").toDate();
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {}).exec(),
         Customer_Management.QAManagementSchema.findOne({Customer: ReceivingData.CustomerId, }, {}, {}).exec(),
      ]).then(response => {
         var Customer = response[0];
         var Request = response[1];
         var Products = ReceivingData.Products.map(obj => {
            const NewObj = {
               Product: mongoose.Types.ObjectId(obj.ProductId),
               Quantity: obj.Quantity,
               UnitPrice: 0,
               TotalAmount: 0
            };
            return NewObj;
         });
         if (Request !== null) {
            Request.Products = Products || [];
            Request.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Updating Basket Details!', Error: err }); 
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Basket Successfully Updated!' });
               }
            });
         } else {
            var Create_BasketCustomerRequest =  new VilfreshBasket_Management.BasketCustomerRequestsSchema({
               Customer: ReceivingData.CustomerId,
               Config_Date: Config_Date,
               Products: Products,
               PO_Status: 'Pending',
               Purchase_Generated: false,
               Delivered: false,
               Region: Customer.Region,
               Active_Status: true,
               If_Deleted: false,
            });
            Create_BasketCustomerRequest.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Creating Basket Details!', Error: err }); 
               } else {
                  const Notification = new NotificationModel.NotificationSchema({
                     User: Customer.ApprovedBy_User,
                     CustomerID: ReceivingData.CustomerId,
                     DeliveryBoyID: null,
                     Notification_Type: 'CustomerGeneratePurchaseRequest',
                     Message: Customer.Customer_Name + " Purchasing VilFresh Product On "  + moment(new Date()).format('"DD/MM/YYYY"'),
                     Message_Received: false,
                     Message_Viewed: false,
                     Active_Status: true,
                     If_Deleted: false
                  });
                  Notification.save();
            
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Vilfresh Basket Successfully Created!' });
               }
            });
         }
      }).catch( error => {      
         res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: error });
      });
   }
};


// Customer QA Details Update
exports.Customer_QADetail_Update = function (req, res) {
   var ReceivingData = req.body;   
      
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "CustomerId can not be empty" });
   } else if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery PersonId can not be empty" });
   } else {      
      ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      
      DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Delivery person Details!.", Error: err });
         } else {
                        
            Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err1, result_1) => {
               if (err1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err1 });
               } else {
                  
                  if (result_1 !== null) {  
                      var QA_Form = [];
                     ReceivingData.QA_Analytics.map(obj => {
                        QA_Form.push({
                           'Question': mongoose.Types.ObjectId(obj.Question),
                           'Answer': mongoose.Types.ObjectId(obj.Answer)
                        });
                     });                
                     
                     result_1.Delivery_Person_QA = ReceivingData.DeliveryPersonId;
                     result_1.QA_Analytics = QA_Form;  
                     result_1.save(function (err_2, result_2){
                        if (err_2) {
                           res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred !.", Error: err_2 });
                        } else {                           
                        Customer_Management.CustomerManagementSchema
                        .updateOne({ _id: result_1._id }, { $set: { QA_Analytics: result_1.QA_Analytics, Delivery_Person_QA: ReceivingData.DeliveryPersonId }}).exec( (err_3, result_3) => {
                           if (err_3) {
                              res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update Customer QA!.", Error: err_3 });
                           } else {
                              res.status(200).send({ Http_Code: 200, Status: true, Message: "SuccessFully QA Details Updated" });
                           }
                        });  
                        }
                     });                
                  } else {
                     res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
                  }
               }
            });
         }
      });
   }
};


// LogOut Device Data Reset
exports.Customer_DeviceReset = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema
         .updateOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { $set: { Firebase_Token: '', DeviceId: '', Device_Type: '' } })
         .exec(function (err, result_1) {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Customer Device Successfully Reset" });
            }
         });
   }
};
