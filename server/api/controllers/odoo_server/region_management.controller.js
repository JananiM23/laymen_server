var RegionManagement = require('../../models/region_management.model');
var mongoose = require('mongoose');


// Region Management System ---------------------------------------------

exports.RegionManagement_Create = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Region_Name || ReceivingData.Region_Name === '') {
        res.status(400).send({ Status: false, Message: "Region Name can not be empty" });
    } else {
        // Region Name verify
        RegionManagement.RegionManagementSchema.findOne({ Region_Name: ReceivingData.Region_Name }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the Region Management!.", Error: err });
            } else {
                if (result === null) {
                    const Create_Region = new RegionManagement.RegionManagementSchema({
                        Region_Name: ReceivingData.Region_Name,
                        OdooId: ReceivingData.OdooId,
                        CompanyId: ReceivingData.CompanyId || null,
                        Active_Status: true,
                        If_Deleted: false
                    });
                    Create_Region.save(function (err_1, result_1) {
                        if (err_1) {
                            res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Region Management!.", Error: err_1 });
                        } else {
                            res.status(200).send({ Status: true, Response: result_1 });
                        }
                    });
                } else {
                    res.status(200).send({ Status: true, Message: 'Already this is Region name added!!!!' });
                }
            }
        });
    }
};



// Region Management List ---------------------------------------------

exports.RegionManagements_List = function (req, res) {
    var ReceivingData = req.body;

    var ShortOrder = { updatedAt: -1 };
    var FindQuery = { 'If_Deleted': false };

    Promise.all([
        RegionManagement.RegionManagementSchema
            .aggregate([
                { $match: FindQuery },
                { $addFields: { Region_NameSort: { $toLower: "$Region_Name" } } },                
                { $project: { Region_Name: 1 } },
                { $sort: ShortOrder },
            ]).exec()
    ]).then(result => {
        res.status(200).send({Http_Code:200, Status: true, Message: 'Region Management List',  Response: result[0] });
    }).catch(err => {
        res.status(417).send({Http_Code:417, Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Region Management list!." });
    });
};


//Region Management Edit
exports.RegionManagement_Edit = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
        res.status(400).send({ Status: false, Message: "Region details is Required!" });
    } else {
        RegionManagement.RegionManagementSchema.findOne({ OdooId: ReceivingData.OdooId, Active_Status: true, If_Deleted: false }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Region Management Details!.", Error: err });
                } else {
                    if (result !== null) {
                        res.status(200).send({ Status: true, Response: result });
                    } else {
                        res.status(400).send({ Status: true, Message: "Invalid Region Details" });
                    }
                }
            });
    }
};


// Region Management Update ---------------------------------------------

exports.RegionManagement_Update = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
        res.status(400).send({ Status: false, Message: "Region Details can not be empty" });
    } else if (!ReceivingData.Region_Name || ReceivingData.Region_Name === '') {
        res.status(400).send({ Status: false, Message: "Delivery Name can not be empty" });
    }  else if (!ReceivingData.Active_Status || ReceivingData.Active_Status === '') {
      res.status(400).send({ Status: false, Message: "Region Status can not be empty" });
    } else {
        RegionManagement.RegionManagementSchema.updateOne(
            { "OdooId": ReceivingData.OdooId }, { $set: { "Region_Name": ReceivingData.Region_Name, Active_Status: ReceivingData.Active_Status } }
        ).exec(function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Region Line!.", Error: err });
            } else {
                RegionManagement.RegionManagementSchema.findOne({ "OdooId": ReceivingData.OdooId }, {}, {}, function (err_1, result_1) {
                    if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find the Region Line!.", Error: err_1 });
                    } else {
                        res.status(200).send({ Status: true, Response: result_1 });
                    }
                });
            }
        });
    }
};


// Region Management Delete ----------------------------------------------------

exports.RegionManagement_Delete = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
        res.status(400).send({ Status: false, Message: "Region Details can not be empty" });
    } else {
        RegionManagement.RegionManagementSchema
            .updateOne({ OdooId: ReceivingData.OdooId }, { $set: { Active_Status: false, If_Deleted: true } })
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: err });
                } else {
                    res.status(200).send({ Status: true, Message: 'Region Management SuccessFully Removed' });
                }
            });
    }
};


