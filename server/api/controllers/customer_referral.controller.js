var User_Management = require('../models/user_management.model');
var ReferralManagement = require('../../mobile_api/models/ReferralManagement.model');
var CustomerManagement = require('../../mobile_api/models/customer_management.model');
var mongoose = require('mongoose');
var moment = require('moment');

// Customer Referral List --------------------------------------
exports.Customer_Referral_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
         } else {
            if (result !== null) {
               var currentDate = new Date();
               var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
               var NewDate = new Date(startOfDay.valueOf() - 7 * 24 * 60 * 60 * 1000);
               
               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               var FindQuery = { 'If_Deleted': false };
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
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                  }
                  });
               }
               Promise.all([
                  ReferralManagement.ReferralManagementSchema.aggregate([
                           { $match: FindQuery },
                           {
                              $lookup: {
                                 from: "Customer_Managements",
                                 let: { "customer": "$Recommender" },
                                 pipeline: [
                                       { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                       { $project: { "Customer_Name": 1, "Mobile_Number": 1, "Region": 1, "createdAt": 1, "Address": 1 } }
                                 ],
                                 as: 'Recommender'
                              }
                           },
                           {
                           $lookup: {
                                 from: "Customer_Managements",
                                 let: { "customer": "$Nominated" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                    { $project: { "Customer_Name": 1, "Mobile_Number": 1, "Region": 1, "createdAt": 1, "Address": 1 } }
                                 ],
                                 as: 'Nominated'
                           }
                        },
                        { $unwind: { path: "$Recommender", preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: "$Nominated", preserveNullAndEmptyArrays: true } },
                        { $addFields: { Region: "$Recommender.Region" } },
                        { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                        { $match: { $expr: { $eq: ["$Region", result.Region] } } },
                        { 
                           $group: {
                              _id: {
                                 Customer_Name: "$Recommender.Customer_Name",
                                 Mobile_Number: "$Recommender.Mobile_Number",
                                 Address: "$Recommender.Address",
                              },
                              TotalReferrals: { $sum: { $cond: { if: {$eq:["$Active_Status", true]}, then: 1, else: 0 } } },
                              NewReferrals: { $sum: { $cond: { if: {$gte:["$createdAt", NewDate]}, then: 1, else: 0 } } },
                              SuccessReferrals: { $sum: { $cond: { if: {$eq:["$RewardCompleted", true]}, then: 1, else: 0 } } },
                              PendingReferrals: { $sum: { $cond: { if: {$eq:["$RewardCompleted", false]}, then: 1, else: 0 } } },
                              NominatedList: { $push: {
                                 _id: "$_id",
                                 CustomerId: "$Nominated._id",
                                 Customer_Name: "$Nominated.Customer_Name",
                                 Mobile_Number: "$Nominated.Mobile_Number",
                                 Address: "$Nominated.Address",
                                 createdAt: "$Nominated.createdAt",
                                 Region: "$Nominated.Region",
                                 RewardCompleted: "$RewardCompleted",
                              } },
                           }
                        },
                        {
                           $project: {
                              _id: 0,
                              Customer_Name: "$_id.Customer_Name",
                              Mobile_Number: '$_id.Mobile_Number',
                              Address: '$_id.Address',
                              TotalReferrals: '$TotalReferrals',
                              NewReferrals: '$NewReferrals',
                              SuccessReferrals: '$SuccessReferrals',
                              PendingReferrals: "$PendingReferrals",
                              Customer_NameSort: "$Customer_Name",
                              NominatedList: "$NominatedList"
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
							ReferralManagement.ReferralManagementSchema.aggregate([
								{ $match: FindQuery },
								{
									$lookup: {
										from: "Customer_Managements",
										let: { "customer": "$Recommender" },
										pipeline: [
												{ $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
												{ $project: { "Customer_Name": 1, "Mobile_Number": 1, "Region": 1, "createdAt": 1, "Address": 1 } }
										],
										as: 'Recommender'
									}
								},
							{ $unwind: { path: "$Recommender", preserveNullAndEmptyArrays: true } },
							{ $addFields: { Region: "$Recommender.Region" } },
							{ $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
							{ $match: { $expr: { $eq: ["$Region", result.Region] } } },
							{ 
								$group: {
									_id: {
										Customer_Name: "$Recommender.Customer_Name",
										Mobile_Number: "$Recommender.Mobile_Number",
										Address: "$Recommender.Address",
									},
									NominatedList: { $push: { _id: "$_id" } },
								}
							}
						]).exec()
               ]).then(result => {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Customer Referral List', Response: result[0], SubResponse: result[1].length });
               }).catch(err => {
                  res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Customer Referral list!." });
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
            }
         }
      });
   }

};
