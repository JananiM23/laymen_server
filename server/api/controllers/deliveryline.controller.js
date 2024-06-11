var Deliveryline_Model = require('../../api/models/deliveryline.model');
var mongoose = require('mongoose');
var User_Management = require('../models/user_management.model');
var OrdersManagement = require('../../mobile_api/models/order_management.model');
var AttendanceManagement = require('../models/attendance_management.model');
var CustomerManagement = require('../../mobile_api/models/customer_management.model');
var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');


// Vil-fresh Delivery Lines Create ---------------------------------------------
exports.VilfreshDeliverylines_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Deliveryline_Name || ReceivingData.Deliveryline_Name === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Name can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details Name can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User) }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err });
         } else {
            ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
            var Create_Delivery_line = new Deliveryline_Model.Delivery_lineSchema({
               Deliveryline_Name: ReceivingData.Deliveryline_Name,
               CreatedUser: ReceivingData.User,
               Region: result.Region,
               Session: ReceivingData.Session || '',
               QueueLength: 0,
               Active_Status: true,
               If_Deleted: false
            });
            Create_Delivery_line.save(function (err_1, result_1) {
               if (err_1) {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Delivery Line!.", Error: err_1 });
               } else {
                  res.status(200).send({ Status: true, Response: result_1 });
               }
            });
         }
      });
   }
};


// Table Vil fresh Delivery Lines List ---------------------------------------------
exports.VilfreshDeliveryLines_List = function (req, res) {
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
               var ShortOrder = { updatedAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               var FindQuery = { 'If_Deleted': false, Region: result.Region };
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }
               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Number') {
                        FindQuery[obj.DBName] = parseInt(obj.Value, 10);
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
                  Deliveryline_Model.Delivery_lineSchema
                     .aggregate([
                        { $match: FindQuery },
								{
									$lookup: {
										 from: "Customer_Managements",
										 let: { "id": "$_id" },
										 pipeline: [
											  { $match: { $expr: { $and: [ { $eq: ["$$id", "$Delivery_Line"] }, { $eq: [false, "$If_Deleted"] } ] } } },
											  { $project: { "Customer_Name": 1 } }
										 ],
										 as: 'customers'
									}
							  	},
								{ $addFields: { numberOfCustomers: {  $size: "$customers" } } },
                        { $addFields: { Deliveryline_NameSort: { $toLower: "$Deliveryline_Name" } } },
                        { $addFields: { SessionSort: { $toLower: "$Session" } } },
                        { $project: { numberOfCustomers: 1, Deliveryline_NameSort: 1, createdAt: 1, Active_Status: 1, Deliveryline_Name: 1, Session: 1, updatedAt: 1, Morning: 1, Evening: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  Deliveryline_Model.Delivery_lineSchema.countDocuments(FindQuery).exec()
               ]).then(result => {

                  res.status(200).send({ Http_Code: 200, Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Delivery Lines list!." });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};


//Vil fresh Delivery Lines Edit
exports.VilfreshDeliveryLines_Edit = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeliverylineId || ReceivingData.DeliverylineId === '') {
      res.status(400).send({ Status: false, Message: "Delivery line details is Required!" });
   } else {
      Deliveryline_Model.Delivery_lineSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.DeliverylineId), Active_Status: true, If_Deleted: false }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The Delivery Line Details!.", Error: err });
            } else {
               if (result !== null) {
                  res.status(200).send({ Status: true, Response: result });
               } else {
                  res.status(400).send({ Status: true, Message: "Invalid Delivery Line Details" });
               }
            }
         });
   }
};


// Vil fresh Delivery Lines Delete
exports.VilfreshDeliveryLines_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeliverylineId || ReceivingData.DeliverylineId === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
		ReceivingData.DeliverylineId = mongoose.Types.ObjectId(ReceivingData.DeliverylineId);
		Promise.all([
			CustomerManagement.CustomerManagementSchema.find({Delivery_Line: ReceivingData.DeliverylineId, If_Deleted: false }, {Customer_Name: 1}, {}).exec(),
			DeliveryPersonModel.DeliveryPersonSchema.find({DeliveryLine: ReceivingData.DeliverylineId, If_Deleted: false }, {DeliveryPerson_Name: 1}, {}).exec()
		]).then(response => {
			var customers = response[0];
			var soldiers = response[1];
			if (customers.length === 0 && soldiers.length === 0) {
				Deliveryline_Model.Delivery_lineSchema
				.updateOne({ _id: ReceivingData.DeliverylineId }, { $set: { Active_Status: false, If_Deleted: true } })
				.exec(function (err, result) {
					if (err) {
						res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
					} else {
						res.status(200).send({ Status: true, Message: 'Delivery Line SuccessFully Removed' });
					}
				});
			} else {
				var candent = "";
				if (customers.length > 0 && soldiers.length > 0) {
					candent = '<b class="color-red"> Unable to Delete</b> <br> <br> Currently <b> ' +  customers.length + '-Customers </b> and <b> ' +  soldiers.length + '-Delivery persons </b> are available in this Delivery Line';
				} else if (customers.length > 0 && soldiers.length === 0 ) {
					candent = '<b class="color-red"> Unable to Delete</b> <br> <br> Currently <b> ' +  customers.length + '-Customers </b> are available in this Delivery Line';
				} else {
					candent = '<b class="color-red"> Unable to Delete</b> <br> <br>  Currently <b> ' +  soldiers.length + '-Delivery </b> persons are available in this Delivery Line';
				}
				res.status(200).send({ Status: false, Alert: true, Message: candent });
			}
		}).catch(error => {
			res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: error });
		});

      
   }
};


// Vil fresh Deliveryline_Update Update ---------------------------------------------
exports.VilfreshDeliverylines_Update = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.DeliverylineId || ReceivingData.DeliverylineId === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Details can not be empty" });
   } else if (!ReceivingData.Deliveryline_Name || ReceivingData.Deliveryline_Name === '') {
      res.status(400).send({ Status: false, Message: "Delivery Line Name can not be empty" });
   } else {
      Deliveryline_Model.Delivery_lineSchema.updateOne(
         { "_id": mongoose.Types.ObjectId(ReceivingData.DeliverylineId) },
         { $set: { "Deliveryline_Name": ReceivingData.Deliveryline_Name } }
      ).exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Delivery Line!.", Error: err });
         } else {
            Deliveryline_Model.Delivery_lineSchema.findOne({ "_id": mongoose.Types.ObjectId(ReceivingData.DeliverylineId) }, {}, {}, function (err_1, result_1) {
               if (err_1) {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err_1 });
               } else {
                  res.status(200).send({ Status: true, Response: result_1 });
               }
            });
         }
      });
   }
};


// All Filter Delivery Lines List ---------------------------------------------
exports.AllVilfreshDeliveryLines_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User) }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err });
         } else {
            Deliveryline_Model.Delivery_lineSchema
               .find({ 'If_Deleted': false, 'Region': result.Region }, { Deliveryline_Code: 1, Deliveryline_Name: 1, QueueLength: 1}, { 'short': { createdAt: 1 } })
               .exec(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err_1 });
                  } else {
                     result_1 = result_1.sort(function (Obj1, Obj2) { return Obj1.Deliveryline_Name.localeCompare(Obj2.Deliveryline_Name); });
                     res.status(200).send({ Status: true, Response: result_1 });
                  }
               });
         }
      });
   }
};


// Session Based Delivery Lines List ---------------------------------------------
exports.SessionBased_DeliveryLines = function (req, res) {
   ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      var CurrentDate = new Date();
      CurrentDate = new Date(CurrentDate.setHours(0, 0, 0, 0));
      var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User) }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err });
         } else {
            Promise.all([
               OrdersManagement.GeneratedOrdersSchema
                  .find({ Date: CurrentDate, Session: CurrentSession, Region: result.Region, Active_Status: true })
                  .exec(),
                  DeliveryPersonModel.DeliveryPersonSchema.find({ DeliveryLine: {$ne: null }, $or: [{ Active_Status: false }, {If_Deleted: true}, { DeliveryPerson_Status: "Pending"}] }).exec(),
               AttendanceManagement.DeliveryPerson_AttendanceSchema
                  .find({ Region: result.Region, Date: CurrentDate, Session: CurrentSession, Active_Status: true, If_Deleted: false })
                  .exec(),
               ]).then(Response => {
               var OrderDetails = JSON.parse(JSON.stringify(Response[0]));
               var InvalidLines = JSON.parse(JSON.stringify(Response[1]));
               var TodayAttendance = JSON.parse(JSON.stringify(Response[2]));

               var DeliverylineIds = [];
               var ExistingIds = [];

               if (TodayAttendance.length > 0) {
                  TodayAttendance.map(obj => {
                     DeliverylineIds.push(obj.DeliveryLineId);
                  });
               }
               if (OrderDetails.length > 0) {
                  OrderDetails.map(obj => {
                     if (DeliverylineIds.includes(obj.DeliveryLine)) {
                        ExistingIds.push(obj.DeliveryLine);
                     }
                  });
               }
               if (InvalidLines.length > 0) {
                  InvalidLines.map(obj => {
                     if (DeliverylineIds.includes(obj.DeliveryLine)) {
                        ExistingIds.push(obj.DeliveryLine);
                     }
                  });
               }
               DeliverylineIds = DeliverylineIds.filter(obj => !ExistingIds.includes(obj));
               DeliverylineIds = DeliverylineIds.map(obj => mongoose.Types.ObjectId(obj));
               Deliveryline_Model.Delivery_lineSchema
                  .find({ 'If_Deleted': false, 'Region': result.Region, _id: { $in: DeliverylineIds }, $or: [{ Session: CurrentSession }, { Session: 'Both' }] }, { Deliveryline_Name: 1 }, { 'short': { createdAt: 1 } })
                  .exec(function (err_2, result_2) {
                     if (err_2) {
                        res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err_2 });
                     } else {
                        result_2 = result_2.sort(function (Obj1, Obj2) { return Obj1.Deliveryline_Name.localeCompare(Obj2.Deliveryline_Name); });
                        res.status(200).send({ Status: true, Response: result_2 });
                     }
                  });
            }).catch(Error => {
               res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!." });
            });
         }
      });
   }
};



// DeliveryLine Name Async Validate -----------------------------------------------
exports.DeliveryBoy_AsyncValidate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Deliveryline_Name || ReceivingData.Deliveryline_Name === '') {
      res.status(400).send({ Status: false, Message: "Deliveryline Name can not be empty" });
   } else {
      Deliveryline_Model.Delivery_lineSchema.findOne({ 'Deliveryline_Name': { $regex: new RegExp("^" + ReceivingData.Deliveryline_Name + "$", "i") } }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ status: false, Message: "Some error occurred while Find the Delivery Name!." });
         } else {
            if (result !== null) {
               res.status(200).send({ Status: true, Available: false });
            } else {
               res.status(200).send({ Status: true, Available: true });
            }
         }
      });
   }
}; 
