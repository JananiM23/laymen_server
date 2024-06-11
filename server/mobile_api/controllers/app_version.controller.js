
var APPVersionManagement = require('../../mobile_api/models/app_version.model');
var mongoose = require('mongoose');


// Customer APP Version Create -----------------------------------------

exports.APPVersion_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.App_Version || ReceivingData.App_Version === '') {
        res.status(400).send({ Status: false, Message: "APP Version can not be empty" });
    } else {
        const Create_APPVersion = new APPVersionManagement.Vil_freshAppVersionSchema({
            App_Version: ReceivingData.App_Version,
            OS_Type : ReceivingData.OS_Type,
            Active_Status: true,
            If_Deleted: false
        });
        Create_APPVersion.save(function (err_1, result_1) {
            if (err_1) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_1 });
            } else {
                res.status(200).send({ Http_Code: 200, Status: true, Message: 'Customer APP Version Created', Response: result_1 });
            }
        });

    }
};


// DeliveryPerson APP Version Create -----------------------------------------

exports.DeliveryPerson_APPVersion_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.App_Version || ReceivingData.App_Version === '') {
        res.status(400).send({ Status: false, Message: "APP Version can not be empty" });
    } else {
        const Create_APPVersion = new APPVersionManagement.DeliveryPersonAppVersionSchema({
            App_Version: ReceivingData.App_Version,
            OS_Type : ReceivingData.OS_Type,
            Active_Status: true,
            If_Deleted: false
        });
        Create_APPVersion.save(function (err_1, result_1) {
            if (err_1) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Support Management!.", Error: err_1 });
            } else {
                res.status(200).send({ Http_Code: 200, Status: true, Message: 'DeliveryPerson APP Version Created', Response: result_1 });
            }
        });

    }
};


// APP Version List Details -----------------------------------------

exports.APPVersion_List = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.OSType || ReceivingData.OSType === '') {
        res.status(400).send({ Status: false, Message: "APP Version can not be empty" });
    } else {
        APPVersionManagement.Vil_freshAppVersionSchema.findOne({ Active_Status: true, If_Deleted: false }, { Item_Counts: 0, Payable_Amount: 0, Active_Status: 0, If_Deleted: 0, createdAt: 0, updatedAt: 0 }, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The Purchase Details!.", Error: err });
                } else {
                    res.status(200).send({ Http_Code: 200, Success: true, App_Version: result.App_Version });
                }
            });
    }
};