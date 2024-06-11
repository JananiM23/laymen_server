var Customer_Feedback = require('../models/Customer_Feedback.model');
var User_Management = require('../../../server/api/models/user_management.model');
var mongoose = require('mongoose');
var multer = require('multer');
var path = require('path');
var fs = require('fs');


// Customer Feedback Created
exports.Feedback_Created = function (req, res) {
   var ReceivingData = req.body;
     
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      var fineName = '';
      if (ReceivingData.Audio_Base64 !== undefined && ReceivingData.Audio_Base64 !== null && ReceivingData.Audio_Base64 !== '') {
         var reportData = ReceivingData.Audio_Base64.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
         var buff = Buffer.from(reportData, 'base64');
         fineName = 'Audio-' +  Date.now() + '.mp3';
         fs.writeFileSync('Uploads/Feedback/' + fineName, buff);
      } else {
         console.log('Audio_Base64 invalid');
      }
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var Feedback = new Customer_Feedback.CustomerFeedbackSchema({
            CustomerId: ReceivingData.CustomerId,
            Rating: ReceivingData.Rating || '0',
            Message: ReceivingData.Message || '',
            Voice_Message: ReceivingData.Audio_Base64,
            Voice_File: fineName,              
            APP_Version: ReceivingData.APP_Version || '',
            Active_Status: true,
            If_Deleted: false,
      });

      Feedback.save(function (err_2, result_2) {
         if (err_2) {
            res.status(417).send({ Http_Code: 201, Status: false, Message: "Some error occurred while Creating the Customer Contact Us system!.", Error: err_2 });
         } else {
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'SuccessFully Customer Feedback Added', CustomerId: result_2._id });
         }
      });
   }
};


// Customer Feedback List

exports.All_Feedback_List = function (req, res) {
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
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
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
                  Customer_Feedback.CustomerFeedbackSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Customer_Managements",
                           let: { "customer": "$CustomerId" },
                           pipeline: [
                                 { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                 { $project: { "Mobile_Number": 1, "Customer_Name": 1, "Region": 1 } }
                           ],
                           as: 'CustomerId'
                        }
                     },
                     { $addFields: { Region: "$CustomerId.Region" } },
                     
                     { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                     { $match: { $expr: { $eq: ["$Region", result.Region] } } },
                     { $unwind: { path: "$CustomerId", preserveNullAndEmptyArrays: true } },
                     { $addFields: { CustomerId: { $ifNull: ["$CustomerId", null] } } },
                     { $addFields: { Rating: { $toLower: "$Rating" } } },
                     { $addFields: { Message: { $toLower: "$Message" } } },
                     { $addFields: { Voice_Message: { $toLower: "$Voice_Message" } } },
                     { $addFields: { APP_Version: { $toLower: "$APP_Version" } } },
                     // { $addFields: { Voice_File: { $toLower: "$Voice_File" } } },
                     { $project: { CustomerId: 1, Rating: 1, Message: 1, Voice_Message: 1, Region: 1, APP_Version: 1, Voice_File: 1, createdAt: 1 } },
                     { $sort: ShortOrder },
                     { $skip: Skip_Count },
                     { $limit: Limit_Count }
                  ]).exec(),
                  Customer_Feedback.CustomerFeedbackSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Customer_Managements",
                           let: { "customer": "$CustomerId" },
                           pipeline: [
                                 { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                 { $project: { "Mobile_Number": 1, "Customer_Name": 1, "Region": 1 } }
                           ],
                           as: 'CustomerId'
                        }
                     },
                     { $addFields: { Region: "$CustomerId.Region" } },
                     
                     { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                     { $match: { $expr: { $eq: ["$Region", result.Region] } } }]).exec()
               ]).then(result => {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Feedback List Management List', Response: result[0], SubResponse: result[1].length });
               }).catch(err => {
                  res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Contact Us Management list!." });
               });
            } else {
               res.status(400).send({ Status: false, Message: 'Invalid User Details' });
            }
         }
      });
   }
};