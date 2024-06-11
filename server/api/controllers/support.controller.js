var User_Management = require('../models/user_management.model');
var SupportManagement = require('../../mobile_api/models/support.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var CustomerManagement = require('../../mobile_api/models/customer_management.model');
var mongoose = require('mongoose');
var moment = require('moment');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;

var options = {
    priority: 'high',
    timeToLive: 60 * 60 * 24
};

// SupportTitle_Update ---------------------------------------------
exports.SupportTitle_Update = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
        res.status(400).send({ Status: false, Message: "Support Title Details can not be empty" });
    } else if (!ReceivingData.Support_Title || ReceivingData.Support_Title === '') {
        res.status(400).send({ Status: false, Message: "Support Title Name can not be empty" });
    } else {
        SupportManagement.SupportTitleSchema.updateOne(
            { "_id": mongoose.Types.ObjectId(ReceivingData.SupportId) },
            { $set: { "Support_Title": ReceivingData.Support_Title } }
        ).exec(function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Support Title Details!.", Error: err });
            } else {
                SupportManagement.SupportTitleSchema.findOne({ "_id": mongoose.Types.ObjectId(ReceivingData.SupportId) }, {}, {}, function (err_1, result_1) {
                    if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find the Support Title Details!.", Error: err_1 });
                    } else {
                        res.status(200).send({ Status: true, Response: result_1 });
                    }
                });
            }
        });
    }
};

// All Filter SupportTitle  List ---------------------------------------------

exports.AllSupportTitle_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User) }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err });
            } else {
                SupportManagement.SupportTitleSchema
                    .find({ 'If_Deleted': false, 'Region': result.Region }, { Support_Title: 1 }, { 'short': { createdAt: 1 } })
                    .exec(function (err_1, result_1) {
                        if (err_1) {
                            res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err_1 });
                        } else {
                            result_1 = result_1.sort(function (Obj1, Obj2) { return Obj1.Support_Title.localeCompare(Obj2.Support_Title); });
                            res.status(200).send({ Status: true, Response: result_1 });
                        }
                    });
            }
        });
    }
};

// SupportTitle List ---------------------------------------------

exports.SupportTitle_List = function (req, res) {
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
                        SupportManagement.SupportTitleSchema
                            .aggregate([
                                { $match: FindQuery },
                                { $addFields: { Support_Title: { $toLower: "$Support_Title" } } },
                                { $project: { Support_Title: 1, createdAt: 1, updatedAt: 1, Support_Status: 1, Active_Status: 1, } },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        SupportManagement.SupportTitleSchema.countDocuments(FindQuery).exec()
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




// Support Title Name Async Validate -----------------------------------------------
exports.SupportTitle_AsyncValidate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Support_Title || ReceivingData.Support_Title === '') {
        res.status(400).send({ Status: false, Message: "Support Title Name can not be empty" });
    } else {
        SupportManagement.SupportTitleSchema.findOne({ 'Support_Title': { $regex: new RegExp("^" + ReceivingData.Support_Title + "$", "i") } }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ status: false, Message: "Some error occurred while Find the Support Title Name!." });
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

// SupportTitle_Details ------------------------------------------ 
exports.SupportTitle_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Support_Title || ReceivingData.Support_Title === '') {
        res.status(200).send({ Status: false, Message: "Support Title can not be empty" });
    } else if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(200).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null) {

                    const Create_SupportTitle = new SupportManagement.SupportTitleSchema({
                        Support_Title: ReceivingData.Support_Title,
                        Support_Status: 'Active', // Active , InActive
                        Region: result.Region,
                        Active_Status: true,
                        If_Deleted: false
                    });
                    Create_SupportTitle.save(function (err_1, result_1) {
                        if (err_1) {
                            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_1 });
                        } else {
                            res.status(200).send({ Status: true, Message: 'Support Title Created', Response: result_1 });
                        }
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
                }
            }
        });
    }
};

//  Support Title Active Status

exports.SupportTitleActiveStatus = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.SupportTitleId || ReceivingData.SupportTitleId === '') {
        res.status(400).send({ Status: false, Message: "Support Title Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.SupportTitleId = mongoose.Types.ObjectId(ReceivingData.SupportTitleId);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        SupportManagement.SupportTitleSchema.findOne({ _id: ReceivingData.SupportTitleId, Active_Status: true, If_Deleted: false }, {}, {})
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Support Title Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        SupportManagement.SupportTitleSchema.updateOne({ _id: result_1._id }, { $set: { Support_Status: ReceivingData.Status } }).exec(function (err_1, result_2) {
                                            if (err_1) {
                                                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Support Title Details!.", Error: err_1 });
                                            } else {
                                                res.status(200).send({ Status: true, Message: "SuccessFully Updated for Support Title Activated", });
                                            }
                                        });
                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid Support Title Details' });
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

//  Support Title In-Active Status

exports.SupportTitleInActiveStatus = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.SupportTitleId || ReceivingData.SupportTitleId === '') {
        res.status(400).send({ Status: false, Message: "Support Title Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.SupportTitleId = mongoose.Types.ObjectId(ReceivingData.SupportTitleId);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        SupportManagement.SupportTitleSchema.findOne({ _id: ReceivingData.SupportTitleId, Active_Status: true, If_Deleted: false }, {}, {})
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Support Title Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        SupportManagement.SupportTitleSchema.updateOne({ _id: result_1._id }, { $set: { Support_Status: ReceivingData.Status } }).exec(function (err_1, result_2) {
                                            if (err_1) {
                                                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Support Title Details!.", Error: err_1 });
                                            } else {
                                                res.status(200).send({ Status: true, Message: "SuccessFully Updated for Support Title Activated", });
                                            }
                                        });
                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid Support Title Details' });
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

// Support Title Simple List -------------------------------
exports.SimpleSupportTitle_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
            if (err_1) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
            } else {
                SupportManagement.SupportTitleSchema
                    .find({ Region: result_1.Region, Active_Status: true, If_Deleted: false }, { Support_Title: 1 }, { sort: { createdAt: -1 } })
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

// Customer SupportManagement updated---------------------------
exports.User_Update_For_CustomerSupport = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
    } else if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.Message || ReceivingData.Message === '') {
        res.status(400).send({ Status: false, Message: "User support can not be empty" });
    } else if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
        res.status(400).send({ Status: false, Message: "Support Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null) {
                    Promise.all([
                        SupportManagement.SupportManagementSchema.findOne({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {sort:{createdAt: -1}}).
                            populate({ path: 'CustomerId', select: 'Firebase_Token' }).exec()
                    ]).then(Response => {
                        var SupportDetailsValue = Response[0];
                        var SupportDetails = SupportDetailsValue.Support_Details;

                        SupportDetails.push({
                            Message_by: 'User',
                            Message: ReceivingData.Message,
                            Date: new Date(),
                            User: ReceivingData.User
                        });
                        SupportManagement.SupportManagementSchema.updateOne({ _id: ReceivingData.SupportId },
                            {
                                $set: {
                                    Support_Details: SupportDetails
                                }
                            }).exec();

                        var CustomerFCMToken = [];
                        var CustomerId = JSON.parse(JSON.stringify(SupportDetailsValue.CustomerId._id));
                        CustomerFCMToken.push(SupportDetailsValue.CustomerId.Firebase_Token);
                        ReceivingData.Message = JSON.parse(JSON.stringify(ReceivingData.Message));
                        var payload = {
                            notification: {
                                title: 'Vilfresh-Team',
                                body: ReceivingData.Message,
                                sound: 'notify_tone.mp3'
                            },
                            data: {
                                Customer: CustomerId,
                                notification_type: 'CustomerSupport',
                                click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                        };
                        FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { }).catch((ErrorRes) => { });
                        res.status(200).send({ Http_Code: 200, Status: true, Message: "Successfully Update for Customer Support!" });
                    }).catch(errorResponse => {
                        res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
                    });
                } else {
                    res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
                }
            }
        });
    }
};



// SupportManagement List --------------------------------------
exports.All_SupportManagement_List = function (req, res) {
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
                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    var FindQuery = { 'If_Deleted': false };
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var AdvancedFindQuery = { };
                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String' && obj.DBName !== 'Mobile_Number') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Number') {
                                FindQuery[obj.DBName] = parseInt(obj.Value, 10);
                            }
                            if (obj.Type === 'String' && obj.DBName === 'Mobile_Number') {
                              AdvancedFindQuery['Customer.Mobile_Number'] = obj.Value;
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
                        SupportManagement.SupportManagementSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "Customer_Managements",
                                        let: { "customer": "$CustomerId" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                            { $project: { "Customer_Name": 1, "Mobile_Number": 1, "Region": 1 } }
                                        ],
                                        as: 'Customer'
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "SupportTitle",
                                        let: { "support": "$Support_Title" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$support", "$_id"] } } },
                                            { $project: { "Support_Title": 1, } }
                                        ],
                                        as: 'SupportTitles'
                                    }
                                },
                                { $addFields: { Region: "$Customer.Region" } },
                                { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                                { $match: { $expr: { $eq: ["$Region", result.Region] } } },
                                { $unwind: { path: "$Customer", preserveNullAndEmptyArrays: true } },
                                { $unwind: { path: "$SupportTitles", preserveNullAndEmptyArrays: true } },
                                { $addFields: { Support_Title: { $toLower: "$SupportTitles.Support_Title" } } },
                                { $addFields: { Customer_Name: { $toLower: "$Customer.Customer_Name" } } },
                                { $addFields: { Mobile_Number: { $toLower: "$Customer.Mobile_Number" } } },
                                { $addFields: { Support_key: { $toLower: "$Support_key" } } },
                                { $match: AdvancedFindQuery },
                                { $project: { Support_Details: 1, Customer_Name: 1, Mobile_Number: 1, Support_Title: 1, Support_key: 1, Customer: 1, Support_Status: 1, createdAt: 1 } },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        SupportManagement.SupportManagementSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "Customer_Managements",
                                        let: { "customer": "$CustomerId" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                            { $project: { "Customer_Name": 1, "Mobile_Number": 1, "Region": 1 } }
                                        ],
                                        as: 'Customer'
                                    }
                                },
                                { $addFields: { Region: "$Customer.Region" } },
                                { $unwind: { path: "$Region", preserveNullAndEmptyArrays: true } },
                                { $match: { $expr: { $eq: ["$Region", result.Region] } } },
                                { $match: AdvancedFindQuery }
                            ]).exec()
                    ]).then(result => {
                        res.status(200).send({ Http_Code: 200, Status: true, Message: 'Customer Support Management List', Response: result[0], SubResponse: result[1].length });
                    }).catch(err => {
                        res.status(417).send({ Http_Code: 417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Contact Us Management list!." });
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
                }
            }
        });
    }

};

// Customer support Closed -----------------------------------
exports.Customer_Support_Closed = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Status: false, Message: "CustomerId Details can not be empty" });
    } else if (!ReceivingData.SupportId || ReceivingData.SupportId === '') {
        res.status(400).send({ Status: false, Message: "SupportId Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        ReceivingData.SupportId = mongoose.Types.ObjectId(ReceivingData.SupportId);
        Promise.all([
            CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).
                populate({ path: 'ApprovedBy_User', select: 'User_Name' }).populate({path: 'Support_Title', select: 'Support_Title'}).exec()
        ]).then(Response => {
            var CustomerDetails = Response[0];
            SupportManagement.SupportManagementSchema.findOne({ CustomerId: ReceivingData.CustomerId, _id: ReceivingData.SupportId, Active_Status: true, If_Deleted: false }, {}, {}).populate({path: 'Support_Title', select: "Support_Title"}).exec((err_1, result_1) => {
                if (err_1) {
                    res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the Customer Management!.", Error: err_1 });
                } else {
                    if (result_1 !== null) {
                        SupportManagement.SupportManagementSchema.updateOne({ _id: ReceivingData.SupportId },
                            {
                                $set: {
                                    Support_Status: "Closed"
                                }
                            }).exec();
                        var SupportMessage = 'This ' + JSON.parse(JSON.stringify(result_1.Support_Title.Support_Title)) + ' has been closed by ' + JSON.parse(JSON.stringify(CustomerDetails.ApprovedBy_User.User_Name));
                        const Notification = new NotificationModel.NotificationSchema({
                            User: mongoose.Types.ObjectId(CustomerDetails.ApprovedBy_User._id),
                            CustomerID: CustomerDetails._id,
                            DeliveryBoyID: null,
                            Notification_Type: 'CustomerSupportClosed',
                            Message: SupportMessage,
                            Message_Received: false,
                            Message_Viewed: false,
                            Active_Status: true,
                            If_Deleted: false
                        });
                        Notification.save(function (err_7, result_7) {
                            if (err_7) {
                                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_7 });
                            } else {
                                CustomerDetails = JSON.parse(JSON.stringify(CustomerDetails));
                                var CustomerFCMToken = [];
                                CustomerFCMToken.push(CustomerDetails.Firebase_Token);
                                var payload = {
                                    notification: {
                                        title: 'Vilfresh-Team',
                                        body: SupportMessage + ' on ' + moment(new Date()).format("DD/MM/YYYY"),
                                        sound: 'notify_tone.mp3'
                                    },
                                    data: {
                                        Customer: CustomerDetails._id,
                                        notification_type: 'CustomerSupportClosed',
                                        click_action: 'FCM_PLUGIN_ACTIVITY',
                                    }
                                };
                                FCM_App.messaging().sendToDevice(CustomerFCMToken, payload, options).then((NotifyRes) => { });
                                res.status(200).send({ Http_Code: 200, Status: true, Message: "Successfully Update for Customer Support!" });
                            }
                        });
                    } else {
                        res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
                    }
                }
            });
        }).catch(error => {
            res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
        });
    }
};


