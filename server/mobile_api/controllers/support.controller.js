var Support_Management = require('../../mobile_api/models/support.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var mongoose = require('mongoose');
var moment = require('moment');



// CustomerSupport_List ------------------------------------------ 
exports.CustomerSupport_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Support_Management.SupportManagementSchema.find({ CustomerId: ReceivingData.CustomerId, Support_Status: 'Closed', Active_Status: true, If_Deleted: false }, { Support_Title: 1, Support_Status: 1, Support_key: 1 }, {})
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: 'CustomerSupport Created', Response: result });
            }
         });
   }
};


// SupportTitle_List ------------------------------------------ 
exports.SupportTitle_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Region || ReceivingData.Region === '') {
      res.status(200).send({ Status: false, Message: "Region Details can not be empty" });
   } else {
      ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
      Support_Management.SupportTitleSchema.find({ Region: ReceivingData.Region, Support_Status: 'Active', Active_Status: true, If_Deleted: false }, { Support_Title: 1, Support_Status: 1 }, {})
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: 'Support Title List', Response: result });
            }
         });
   }
};

// SupportTitle_Detail ------------------------------------------ 
exports.SupportTitle_Detail = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.SupportTitleId || ReceivingData.SupportTitleId === '') {
      res.status(200).send({ Status: false, Message: "SupportTitle Details can not be empty" });
   } else {
      ReceivingData.SupportTitleId = mongoose.Types.ObjectId(ReceivingData.SupportTitleId);
      Support_Management.SupportTitleSchema.findOne({ _id: ReceivingData.SupportTitleId, Active_Status: true, If_Deleted: false }, { Support_Title: 1, Support_Status: 1 }, {})
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: 'Support Title Detail', Response: result });
            }
         });
   }
};

// CustomerSupport_Reply And Create ------------------------------------------ 
exports.CustomerSupport_Reply = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.SupportTitleId || ReceivingData.SupportTitleId === '') {
      res.status(200).send({ Status: false, Message: "Support Title Details can not be empty" });
   } else if (!ReceivingData.Message || ReceivingData.Message === '') {
      res.status(200).send({ Status: false, Message: "Customer Message can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.SupportTitleId = mongoose.Types.ObjectId(ReceivingData.SupportTitleId);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec(),
         Support_Management.SupportTitleSchema.findOne({ _id: ReceivingData.SupportTitleId, Active_Status: true, If_Deleted: false }).exec(),
      ]).then(Response => {
         if (Response[0] !== null && Response[1] !== null) {
            if (Response[0].Customer_Status !== 'InActivated') {
               Support_Management.SupportManagementSchema.findOne({ CustomerId: ReceivingData.CustomerId, Support_Status: 'Open', Support_Title:ReceivingData.SupportTitleId,  Active_Status: true, If_Deleted: false }, {}, {}, function (errCheck, supportCheck) {
                  if (errCheck) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Support!.", Error: errCheck });
                  } else {
                     if (supportCheck === null) {
                        // Support Details Unique Generator
                        Support_Management.SupportManagementSchema.findOne({}, {}, { 'sort': { createdAt: -1 } }, function (errSup, support_result) {
                           if (errSup) {
                              res.status(417).send({ Status: false, Message: "Some error occurred while Find the Support!.", Error: errSup });
                           } else {
                              var Unique_key = support_result !== null ? (support_result.Support_Unique_key + 1) : 1;
                              var Unique_KeyValue = 'Support-' + (Unique_key.toString()).padStart(4, 0);

                              const Create_SupportManagement = new Support_Management.SupportManagementSchema({
                                 CustomerId: ReceivingData.CustomerId,
                                 Support_key: Unique_KeyValue,
                                 Support_Unique_key: Unique_key,
                                 Support_Title: ReceivingData.SupportTitleId,
                                 Support_Status: 'Open', // Open , Closed
                                 Support_Details: [{
                                    Message_by: 'Customer',
                                    Message: ReceivingData.Message,
                                    Date: new Date(),
                                    User: null
                                 }],
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              Create_SupportManagement.save(function (err_1, result_1) {
                                 if (err_1) {
                                    res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_1 });
                                 } else {
                                    var SupportMessage = 'A Customer wants to be raised to support issues,' + 'SupportTitle Name: ' + JSON.parse(JSON.stringify(Response[1].Support_Title)) + ', Customer Name: ' + JSON.parse(JSON.stringify(Response[0].Customer_Name)) + ', Mobile No: ' + JSON.parse(JSON.stringify(Response[0].Mobile_Number));
                                    const Notification = new NotificationModel.NotificationSchema({
                                       User: mongoose.Types.ObjectId(Response[0].ApprovedBy_User),
                                       CustomerID: Response[0]._id,
                                       DeliveryBoyID: null,
                                       Notification_Type: 'CustomerSupportCreated',
                                       Message: SupportMessage,
                                       Message_Received: false,
                                       Message_Viewed: false,
                                       Active_Status: true,
                                       If_Deleted: false
                                    });
                                    Notification.save(function (err_3, result_3) {
                                       if (err_3) {
                                          res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Notification System!.", Error: err_3 });
                                       } else {
                                          res.status(200).send({ Http_Code: 200, Status: true, Message: 'CustomerSupport Created', Response: result_1 });
                                       }
                                    });
                                 }
                              });
                           }
                        });
                     } else if (supportCheck.Support_Status === 'Closed') {
                        res.status(200).send({ Http_Code: 200, Status: false, Message: "This Support Details Closed!" });
                     } else {
                        var SupportArr = JSON.parse(JSON.stringify(supportCheck.Support_Details));
                        SupportArr.push({
                           Message_by: 'Customer',
                           Message: ReceivingData.Message,
                           Date: new Date(),
                           User: null
                        });
                        Support_Management.SupportManagementSchema
                           .updateOne({ CustomerId: ReceivingData.CustomerId, Support_Title:ReceivingData.SupportTitleId, Support_Status: 'Open', }, { $set: { Support_Details: SupportArr } }).exec((err_1, result_1) => {
                              if (err_1) {
                                 res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Support Management!.", Error: err_1 });
                              } else {
                                 res.status(200).send({ Http_Code: 200, Status: true, Message: "Successfully Update for Customer Support!" });
                              }
                           });
                     }
                  }
               });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App Access UnAvailable....Please Contact to Vilfresh Team!!!.", });
            }
         } else {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer Details Or Support Title Details.", });
         }
      }).catch(Error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred.", });
      });
   }
};




// CustomerSupport_Details ------------------------------------------ 
exports.CustomerSupport_Detail = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.SupportTitleId || ReceivingData.SupportTitleId === '') {
      res.status(200).send({ Status: false, Message: "Support Details can not be empty" });
   } else {
      ReceivingData.SupportTitleId = mongoose.Types.ObjectId(ReceivingData.SupportTitleId);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         Support_Management.SupportManagementSchema.find({ Support_Title: ReceivingData.SupportTitleId, CustomerId: ReceivingData.CustomerId, Support_Status: 'Closed', Active_Status: true, If_Deleted: false }, { Support_Title: 1, Support_Status: 1, Support_key: 1, Support_Details: 1 }, {sort: {createdAt: -1}})
            .populate({ path: 'Support_Title', select: 'Support_Title' }).exec()
      ]).then(Response => {
         var SupportDetails = Response[0];
         var SupportArr = [];
         var ClosedSupport = {
            "_id": String,
            "Support_key": String,
            "Support_Title": {
               "_id": String,
               "Support_Title": String
            },
            "Support_Status": String,
            "Support_Details": []
         };
         if (SupportDetails.length !== 0) {
            SupportDetails.map(obj => {
               ClosedSupport._id = obj._id;
               ClosedSupport.Support_key = obj.Support_key;
               ClosedSupport.Support_Title._id = obj.Support_Title._id;
               ClosedSupport.Support_Title.Support_Title = obj.Support_Title.Support_Title;
               ClosedSupport.Support_Status = obj.Support_Status;
               obj.Support_Details.map(Obj => {
                  SupportArr.push({
                     "Message_by": Obj.Message_by,
                     "Message": Obj.Message,
                     "Date": Obj.Date,
                     "User": Obj.User,
                     "Support_Status": "Closed"
                  });

               });
            });
            ClosedSupport.Support_Details = SupportArr;
         }
         Support_Management.SupportManagementSchema.findOne({ Support_Title: ReceivingData.SupportTitleId,  CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { Support_Title: 1, Support_Status: 1, Support_key: 1, Support_Details: 1 }, { sort: { createdAt: -1 }})
            .populate({ path: 'Support_Title', select: 'Support_Title' }).exec((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err });
               } else {
                  if (result !== null) {
                     if (result.Support_Status === 'Closed') {
                     const sortedDate = ClosedSupport.Support_Details.sort(function (a, b) {
                           return new Date(b.Date).getTime() - new Date(a.Date).getTime();
                       });
                     ClosedSupport.Support_Details = sortedDate;  
                     ClosedSupport = JSON.parse(JSON.stringify(ClosedSupport));
                     ClosedSupport.Support_Details.map(obj => {
                        obj.Date = moment(new Date(obj.Date)).format("DD/MM/YYYY hh:mm a");
                        return obj;
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: 'CustomerSupport Details', Response: ClosedSupport });
                     }
                     
                     
                     result = JSON.parse(JSON.stringify(result));
                     result.Support_Details.map(obj => {                        
                        obj.Support_Status = 'Open';
                        return obj;
                     });
                     var SupportArray = result.Support_Details.concat(SupportArr);
                     const sortedDate = SupportArray.sort(function (a, b) {
                        return new Date(b.Date).getTime() - new Date(a.Date).getTime();
                    });
                    result.Support_Details = sortedDate;
                     result.Support_Details.map(obj => {
                        obj.Date = moment(new Date(obj.Date)).format("DD/MM/YYYY hh:mm a");                        
                        return obj;
                     });
                     if (result.Support_Status === 'Open') {
                        res.status(200).send({ Http_Code: 200, Status: true, Message: 'CustomerSupport Details', Response: result });
                     }                     
                  } else {
                     res.status(400).send({ Http_Code: 400, Status: false, Message: 'Invalid Customer Details' });
                  }
               }
            });
      }).catch(Error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Occurred Error' });
      });
   }
};




