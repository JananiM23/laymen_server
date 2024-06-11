var PurchaseManagement = require('../../../server/mobile_api/models/purchaseOrder.model');
var ProductManagement = require('../../../server/api/models/product_management.model');
var CustomerManagement = require('../../../server/mobile_api/models/customer_management.model');
var mongoose = require('mongoose');
var moment = require('moment');


// Purchase Management system

exports.PurchaseManagement_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err });
                } else {
                    if (result !== null) {
                        var PurchaseCreate = new PurchaseManagement.PurchaseSchema({
                            CustomerId: ReceivingData.CustomerId,
                            Purchase_Details: ReceivingData.Purchase_Details,
                            FromDate: ReceivingData.FromDate,
                            Item_Counts: 0,
                            Payable_Amount: 0,
                            Active_Status: true,
                            If_Deleted: false
                        });

                        PurchaseCreate.save(function (err_1, result_1) {
                            if (err_1) {
                                res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Purchase Management!.", Error: err_1 });
                            } else {
                                res.status(200).send({ Http_Code: 200, Status: true, Message: "Purchase Order SuccessFully Created!." });
                            }
                        });
                    } else {
                        res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!." });
                    }
                }
            });
    }
};


// Purchase Order list Details ---------------------------------------------------------


exports.PurchaseOrder_List = function (req, res) {

    var ReceivingData = req.body;

    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
        PurchaseManagement.PurchaseSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { Item_Counts: 0, Payable_Amount: 0, Active_Status: 0, If_Deleted: 0, createdAt: 0, updatedAt: 0 }, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The Purchase Details!.", Error: err });
                } else {
                    res.status(200).send({ Http_Code: 200, Success: true, Message: "Purchase order List!.", Response: result });
                }
            });
    }
};