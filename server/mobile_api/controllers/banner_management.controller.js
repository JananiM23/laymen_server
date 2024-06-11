var Banner_Management = require('../../mobile_api/models/banner_management.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var User_Management = require('../../api/models/user_management.model');

var mongoose = require('mongoose');
var fs = require('fs');
var svg2img = require('svg2img');

exports.Banner_Register = function (req, res) { 
   var ReceivingData = req.body;
   if (!ReceivingData.file || ReceivingData.file === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Banner File can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      Promise.all([
         Banner_Management.BannerManagementSchema.findOne({ Title: ReceivingData.title, Active_Status: true, If_Deleted: false }).exec(),
         User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec()
      ]).then(response => {
         var BannerData = response[0];
         var UserData = response[1];
         if (BannerData === null && UserData !== null) {
            var BannerRegister = new Banner_Management.BannerManagementSchema({
               Banner_file: ReceivingData.file || '',
               Title: ReceivingData.title || '',
               Description: ReceivingData.description || '',
               File_Name: '',
               Active_Status: true,
               If_Deleted: false,
               Banner_Status: '',
               User: ReceivingData.User,
            });
            BannerRegister.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Validate Update the Banner  Details!", Error: err_1 });
               } else {
                  if (ReceivingData.file) {
                     var reportData  = ReceivingData.file.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                     var buff = Buffer.from(reportData, 'base64');
                     const fineName = 'Uploads/Banner/' + result_1._id + '.png';
                     result_1.File_Name = result_1._id + '.png';
                     var FileName = result_1.File_Name;
                     Banner_Management.BannerManagementSchema.updateOne({_id: result_1._id}, {File_Name: FileName}).exec();
                     fs.writeFileSync(fineName, buff);
                  }
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Banner Registered Successfully' });
               }
            });
         } else {
            if (UserData === null) {
               res.status(400).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details!' });
            } else if (BannerData !== null) {
               res.status(400).send({ Http_Code: 400, Status: true, Message: 'Banner Title Already created!' });
            }
         }
      }).catch(error => { 
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Banner Details!.", Error: error });
      });
   }
};
 
// VilFresh Banner List ---------------------------------------------
exports.AllBanner_List = function (req, res) {
   var ReceivingData = req.body;
   User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec( (error, response) => {
      if (error) {
         res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The User Details!." });
      } else {
         if (response !== null) {
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
               Banner_Management.BannerManagementSchema
               .aggregate([
                  { $match: FindQuery },
                  {
                     $lookup: {
                           from: "User_Managements",
                           let: { "user": "$User" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$user", "$_id"] } } },
                              { $project: { "Region": 1 } }
                           ],
                           as: 'user'
                     }
                  },
                  { $addFields: { Region: "$user.Region" } },
                  { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                  { $match: { $expr: { $eq: ["$Region", response.Region] } } },
                  { $addFields: { TitleSort: { $toLower: "$TitleSort" } } },
                  { $addFields: { DescriptionSort: { $toLower: "$DescriptionSort" } } },          
                  { $project: { TitleSort: 1, DescriptionSort: 1, Title: 1, Description: 1,Banner_file: 1, Banner_Status: 1, Active_Status: 1, createdAt: 1, updatedAt: 1 } },
                  { $sort: ShortOrder },
                  { $skip: Skip_Count },
                  { $limit: Limit_Count }
               ]).exec()
            ]).then(result => {
					var aggResult = JSON.parse(JSON.stringify(result[0]));
					const SubResponse = aggResult.length;
					var returnData = aggResult.splice(Skip_Count, Limit_Count);

               res.status(200).send({ Status: true, Response: returnData, SubResponse: SubResponse });
            }).catch(err => {
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Banner list!." });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid User Details" });
         }
      }
   });

};
 
 //VilFresh Banner Edit
 exports.Banner_Edit = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.BannerId || ReceivingData.BannerId === '') {
       res.status(400).send({ Status: false, Message: "Banner Id Details is Required!" });
    } else {
        Banner_Management.BannerManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.BannerId), Active_Status: true, If_Deleted: false }, {}, {})
          .exec(function (err, result) {
             if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Banner Details!.", Error: err });
             } else {
                if (result !== null) {
                  res.status(200).send({ Status: true, Response: result });
                } else {
                  res.status(400).send({ Status: true, Message: "Invalid Banner  Details" });
            }
         }
      });
   }
 };
 
 exports.Banner_Delete = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.BannerId || ReceivingData.BannerId === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        Banner_Management.BannerManagementSchema
          .updateOne({ _id: mongoose.Types.ObjectId(ReceivingData.BannerId) }, { $set: { Active_Status: false, If_Deleted: true } })
          .exec(function (err, result) {
             if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
             } else {
                res.status(200).send({ Status: true, Message: 'Banner SuccessFully Removed' });
             }
          });
    }
 };
 
 
 exports.Banner_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.BannerId || ReceivingData.BannerId === '') {
       res.status(400).send({ Status: false, Message: "Banner Details can not be empty" });
   }  else {
      Banner_Management.BannerManagementSchema.findOne({ "_id": mongoose.Types.ObjectId(ReceivingData.BannerId) }, {}, {})
           .exec(function (err_1, result_1) {
               if (err_1) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find the Banner Details!.", Error: err_1 });
               } else {
                     result_1.Banner_file = ReceivingData.file || '',
                     result_1.Title = ReceivingData.title || '',
                     result_1.Description = ReceivingData.description || '',
                     result_1.File_Name = '',

                     result_1.save(function (err_1, result) {
                        if (err_1) {
                              res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err_1 });
                        } else {
                           if (ReceivingData.file) {
                              var reportData  = ReceivingData.file.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                              var buff = Buffer.from(reportData, 'base64');
                              const fineName = 'Uploads/Banner/' + result._id + '.png';
                              result.File_Name = result._id + '.png';
                              var FileName = result.File_Name;
                              Banner_Management.BannerManagementSchema.updateOne({_id: result._id}, {File_Name: FileName}, {Title: result.title}).exec();
                              fs.writeFileSync(fineName, buff);
                           }
                           res.status(200).send({ Status: true, Message: "Banner Details Successfully Updated" });
                        }
                  });
            }
      });
   }
};


exports.Banner_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Http_Code: 400, Message: "Customer Details can not be empty" }); 
   } else {
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
         } else {
            if (result !== null) {
               Banner_Management.BannerManagementSchema
               .aggregate([
                  {
                     $lookup: {
                         from: "User_Managements",
                         let: { "user": "$User" },
                         pipeline: [
                             { $match: { $expr: { $eq: ["$$user", "$_id"] } } },
                             { $project: { "Region": 1 } }
                         ],
                         as: 'user'
                     }
                  },
                  { $addFields: { Region: "$user.Region" } },
                  { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                  { $match: { $expr: { $eq: ["$Active_Status", true] } } },
                  { $match: { $expr: { $eq: ["$Region", result.Region] } } },
                  { $project: { File_Name: 1, Title: 1 , Description: 1, createdAt: 1, updatedAt: 1 } },
               ]).exec( (error, response) => {
                     if (error) {
                        res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err });
                     } else {
                        res.status(200).send({  Http_Code: 200, Success: true, Message: "Success", Response: response });
                     }
                  });
            } else {
               res.status(200).send({  Http_Code: 400, Success: false, Message: "Invalid Customer Details" });
            }
         }
      }); 
   }
};


exports.Banner_Inactive = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.BannerId || ReceivingData.BannerId === '') {
       res.status(400).send({ Status: false, Message: "Banner Id can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "Admin Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       ReceivingData.BannerId = mongoose.Types.ObjectId(ReceivingData.BannerId);
       User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
           .exec(function (err, result) {
               if (err) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
               } else {
                   if (result !== null) {
                     Banner_Management.BannerManagementSchema.findOne({ _id: ReceivingData.BannerId }, {}, {})
                           .exec(function (err_1, result_1) {
                               if (err_1) {
                                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                               } else {
                                   if (result_1 !== null) {
                                    Banner_Management.BannerManagementSchema.updateOne({ _id: result_1._id },
                                           {
                                             $set: {
                                                Banner_Status: ReceivingData.Banner_Status,
                                                ApprovedBy_User: ReceivingData.User,
                                             }
                                           }).exec();
                                       res.status(200).send({ Http_Code: 200, Status: true, Message: 'Banner Account as been In-Activated' });
                                   } else {
                                    res.status(417).send({ Http_Code: 400, Status: false, Message: 'Invalid  Banner Details' });
                                 }
                               }
                           });
                   } else {
                     res.status(417).send({ Status: false, Message: 'Invalid Banner Details' });
               }
         }
      });
   }
};

exports.Banner_Active = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.BannerId || ReceivingData.BannerId === '') {
       res.status(400).send({ Status: false, Message: "Banner Id can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "Admin Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       ReceivingData.BannerId = mongoose.Types.ObjectId(ReceivingData.BannerId);
       User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
           .exec(function (err, result) {
               if (err) {
                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
               } else {
                   if (result !== null) {
                     Banner_Management.BannerManagementSchema.findOne({ _id: ReceivingData.BannerId }, {}, {})
                           .exec(function (err_1, result_1) {
                               if (err_1) {
                                   res.status(417).send({ Status: false, Message: "Some error occurred while Find The Banner Details!.", Error: err_1 });
                               } else {
                                   if (result_1 !== null) {
                                    Banner_Management.BannerManagementSchema.updateOne({ _id: result_1._id },
                                           {
                                             $set: {
                                                Banner_Status: ReceivingData.Banner_Status,
                                                ApprovedBy_User: ReceivingData.User,
                                             }
                                           }).exec();
                                       res.status(200).send({ Http_Code: 200, Status: true, Message: 'Banner Account as been Activated' });
                                   } else {
                                    res.status(417).send({ Http_Code: 400, Status: false, Message: 'Invalid  Banner Details' });
                                 }
                               }
                           });
               } else {
               res.status(417).send({ Status: false, Message: 'Invalid Banner Details' });
            }
         }
      });
   }
};



