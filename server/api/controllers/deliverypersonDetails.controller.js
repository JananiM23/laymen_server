var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');
var User_Management = require('../../api/models/user_management.model');
var DeliverylineModel = require('../models/deliveryline.model');
var OrderManagement = require('../../mobile_api/models/order_management.model');
var AttendanceManagement = require('../models/attendance_management.model');
var mongoose = require('mongoose');
const axios = require('axios');
var moment = require('moment');


// Delivery Person Created System
exports.DeliveryPerson_Create_From_Web = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Mobile_Number || ReceivingData.Mobile_Number === '') {
        res.status(400).send({ Status: false, Message: "Mobile Number can not be empty" });
    } else if (!ReceivingData.DeliveryPerson_Name || ReceivingData.DeliveryPerson_Name === '') {
        res.status(400).send({ Status: false, Message: "Name is required field" });
    } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
        res.status(400).send({ Status: false, Message: "Delivery Line Details is required field" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        var DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine._id);
        var DeliverySession = ReceivingData.DeliveryLine.Session;

        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ Mobile_Number: ReceivingData.Mobile_Number }).exec(),
            User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec(),
            DeliverylineModel.Delivery_lineSchema.findOne({ _id: DeliveryLine, Active_Status: true, If_Deleted: false }).exec(),
        ]).then(response => {
            var ExistingPerson = response[0];
            var UserDetails = response[1];
            var DeliveryLineDetails = response[2];
            if (ExistingPerson === null && UserDetails !== null && DeliveryLineDetails !== null) {
                var DeliveryPersonRegister = new DeliveryPersonModel.DeliveryPersonSchema({
                    Mobile_Number: ReceivingData.Mobile_Number,
                    MobileVerify_OTP_No: '',
                    Password: '',
                    DeliveryPerson_Name: ReceivingData.DeliveryPerson_Name || '',
                    Email: ReceivingData.Email || '',
                    Region: UserDetails.Region,
                    Gender: ReceivingData.Gender,
                    Area: ReceivingData.Area,
                    Address: ReceivingData.Address,
                    Alternate_Mobile_No: ReceivingData.Alternate_Mobile_No || '',
                    DateOf_Birth: moment(ReceivingData.DateOf_Birth, "YYYY/MM/DD HH:mm").toDate() || null,
                    Marital_Status: ReceivingData.Marital_Status || false,
                    Driving_License_No: ReceivingData.Driving_License_No,
                    Driving_License_ExpiryDate: moment(ReceivingData.Driving_License_ExpiryDate, "YYYY/MM/DD HH:mm").toDate() || null,
                    Latitude: '',
                    Longitude: '',
                    LaterAttendance: true,
                    CompanyId: UserDetails.CompanyId,
                    OdooId: '',
                    DeliveryLine: DeliveryLine || null,
                    Session: DeliverySession || '',
                    ApprovedBy_User: null,
                    DeliveryPerson_Status: 'Pending',
                    Firebase_Token: '',
                    Device_Type: '',
                    Device_Id: '',
                    Pin: null,
                    Confirm_Pin: null,
                    Register_From: 'Web',
                    Active_Status: true,
                    If_Deleted: false,
                });
                DeliveryPersonRegister.save((err, result) => {
                    if (err) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the Delivery Person Details!", Error: err });
                    } else {
                        res.status(200).send({ Status: true, Message: "Registered SuccessFully!" });
                    }
                });
            } else {
                if (ExistingPerson !== null) {
						 if (ExistingPerson.Active_Status === true && ExistingPerson.If_Deleted === false) {
							res.status(400).send({ Status: false, Message: "Already Registered!" });
						 } else {
							res.status(400).send({ Status: false, Message: "The Mobile Number is Already Exist!" }); 
						 }
                } else if (UserDetails === null) {
                    res.status(400).send({ Status: false, Message: "Invalid User Details!" });
                } else {
                    res.status(417).send({ Status: false, Message: "Some Error Occurred!" });
                }
            }
        }).catch(error => {
            res.status(417).send({ Status: false, Message: "Some error occurred while find the Delivery Person Details!", Error: error });
        });
    }
};


//Delivery person Details update
exports.DeliveryPerson_Details_Update = function (req, res) {
	var ReceivingData = req.body;
	if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
		res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
	} else if (!ReceivingData.DeliveryPerson_Name || ReceivingData.DeliveryPerson_Name === '') {
		res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Name is required field" });
	} else {
		Promise.all([
			DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId), Active_Status: true, If_Deleted: false }).exec(),
			DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: {$ne: mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId) }, Mobile_Number: ReceivingData.Mobile_Number }).exec(),
		]).then(response => {
			var DeliveryPerson = response[0];
			var MobileExist = response[1]; 
			if (DeliveryPerson !== null && MobileExist === null) {
				var DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine._id);
				var DeliverySession = ReceivingData.DeliveryLine.Session;

				DeliveryPerson.Mobile_Number = ReceivingData.Mobile_Number;
				DeliveryPerson.DeliveryPerson_Name = ReceivingData.DeliveryPerson_Name || '';
				DeliveryPerson.Email = ReceivingData.Email || '';
				DeliveryPerson.Gender = ReceivingData.Gender;
				DeliveryPerson.Area = ReceivingData.Area;
				DeliveryPerson.Address = ReceivingData.Address;
				DeliveryPerson.DeliveryLine = DeliveryLine;
				DeliveryPerson.Session = DeliverySession;
				DeliveryPerson.Driving_License_No = ReceivingData.Driving_License_No;
				DeliveryPerson.Driving_License_ExpiryDate = moment(ReceivingData.Driving_License_ExpiryDate, "YYYY/MM/DD HH:mm").toDate() || null;
				DeliveryPerson.save((err, result) => {
					if (err) {
						res.status(417).send({ Status: false, Message: "Some error occurred while Validate Update the Delivery Person Details!", Error: err });
					} else {
						DeliverylineModel.Delivery_lineSchema.findOne({ _id: DeliveryLine, Active_Status: true, If_Deleted: false })
						.exec((Error, ResDelivery) => {
							if (Error) {
								res.status(417).send({ Status: false, Message: "Some error occurred while Find The Delivery Line Details!.", Error: Error });
							} else {
								if (ResDelivery !== null) {
									if (result.DeliveryPerson_Status !== 'Pending') {
										var Gender = result.Gender === 'Male' ? 'male' : 'female';
										var Status = result.DeliveryPerson_Status === 'Approval' ? 'True' : 'False';
										axios({
											method: 'get', url: 'https://www.vilfresh.in/api/employee/update', data: {
												params: {
													"emp_id": result.OdooId,
													"company": result.CompanyId,
													"name": result.DeliveryPerson_Name,
													"work_phone": result.Mobile_Number,
													"work_email": result.Email,
													"gender": Gender || '',
													"delivery_line_name": ResDelivery.Deliveryline_Name || '',
													"address": result.Address || '',
													"area": result.Area || '',
													"active": Status
												}
											}
										}).then(Response => {
											//  console.log(Response.data.result);
										}).catch(errorRes => {
											console.log('Delivery Boy Odoo Update Error');
										});
									}
									res.status(200).send({ Status: true, Message: 'Delivery Person Details Successfully Updated', Response: result });
								} else {
									res.status(400).send({ Status: false, Message: "Invalid Delivery Line" });
								}
							}
						});
					}
				});
			} else {
				if (MobileExist !== null) {
					res.status(400).send({ Status: false, Message: "The Mobile Number is Already Exist!" });
				} else {
					res.status(400).send({ Status: false, Message: "Invalid Delivery Person Details!" });
				}
			}
		}).catch( error => {
			res.status(417).send({ Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: error });
		});
	}
};



// All Delivery person details view
exports.DeliveryPersonDetails_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null) {

                    var ReceivingData = req.body;
                    var Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    var Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = { 'If_Deleted': false, 'Region': result.Region };
                    if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                        ReceivingData.FilterQuery.map(obj => {
                            if (obj.Type === 'String') {
                                FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                            }
                            if (obj.Type === 'Select') {
                                FindQuery[obj.DBName] = obj.Value;
                            }
                            if (obj.Type === 'Date') {
                                if (FindQuery[obj.DBName] === undefined) {
                                    FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                } else {
                                    var DBName = obj.DBName;
                                    var AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                                    FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                                }
                            }
                            if (obj.Type === 'Object') {
                                FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                            }
                        });
                    }
                    Promise.all([
                        DeliveryPersonModel.DeliveryPersonSchema
                            .aggregate([
                                { $match: FindQuery },
                                {
                                    $lookup: {
                                        from: "Delivery_Line",
                                        let: { "deliveryLine": "$DeliveryLine" },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ["$$deliveryLine", "$_id"] } } },
                                            { $project: { "Deliveryline_Name": 1 } }
                                        ],
                                        as: 'DeliveryLine'
                                    }
                                },
                                { $unwind: { path: "$DeliveryLine", preserveNullAndEmptyArrays: true } },
                                { $addFields: { DeliveryLine: { $ifNull: ["$DeliveryLine", null] } } },
                                { $addFields: { Mobile_NumberSort: { $ifNull: ["$Mobile_Number", null] } } },
                                { $addFields: { DeliveryPerson_NameSort: { $toLower: "$DeliveryPerson_Name" } } },
                                { $addFields: { EmailSort: { $toLower: "$Email" } } },
                                { $addFields: { GenderSort: { $toLower: "$Gender" } } },
                                { $addFields: { DeliveryPerson_StatusSort: { $toLower: "$DeliveryPerson_Status" } } },
                                { $addFields: { AddressSort: { $toLower: "$Address" } } },
                                { $addFields: { AreaSort: { $toLower: "$Area" } } },
                                { $addFields: { DeliveryLineSort: { $toLower: "$DeliveryLine.Deliveryline_Name" } } },
                                //{ $addFields: { RegionSort: { $toLower: "$Region" } } },
                                {
                                    $project: {
                                        DeliveryPerson_Name: 1,
                                        Mobile_Number: 1, DeliveryPerson_Status: 1,
                                        Gender: 1,
                                        Address: 1, Area: 1,
                                        Latitude: 1,
                                        Longitude: 1,
                                        updatedAt: 1,
                                        Alternate_Mobile_No: 1,
                                        Marital_Status: 1,
                                        DateOf_Birth: 1,
                                        Driving_License_No: 1,
                                        Driving_License_ExpiryDate: 1,
                                        DeliveryLine: 1, Session: 1, Email: 1, Active_Status: 1, If_Deleted: 1, createdAt: 1,
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        DeliveryPersonModel.DeliveryPersonSchema.countDocuments(FindQuery).exec()
                    ]).then(result => {
                        res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
                    }).catch(err => {
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Delivery Person Details list!." });
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
                }
            }
        });
    }

};



// Delivery Person Details Edit
exports.DeliveryPersonDetails_Edit = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(417).send({ Status: false, Message: "Delivery Person Details can not be empty" });
    } else {
        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId), Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Boy Details!.", Error: err });
            } else {
                if (result !== null) {
                    res.status(200).send({ Status: true, Response: result });
                } else {
                    res.status(400).send({ Status: false, Message: "Invalid Delivery Person Details!" });
                }
            }
        });
    }
};


// User Update for DeliveryDoy Approval
exports.User_Update_DeliveryBoy_Approval = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId }, {}, {})
                            .populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' })
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        if (result_1.DeliveryPerson_Status === "Approval") {
                                            res.status(200).send({ Status: true, Message: "Someone Already Updated Customer Details" });
                                        } else if (result_1.DeliveryLine === null) {
                                            res.status(417).send({ Status: false, Message: 'You need to Delivery line a session first!' });
                                        } else if (result_1.Region === null) {
                                            res.status(417).send({ Status: false, Message: 'Your Region line not assigned' });
                                        } else {
                                            DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: result_1._id },
                                                {
                                                    $set: {
                                                        DeliveryPerson_Status: ReceivingData.DeliveryPerson_Status,
                                                        ApprovedBy_User: ReceivingData.User,
                                                        CompanyId: result.CompanyId || null,
                                                    }
                                                }).exec();
                                            if (result_1.DeliveryPerson_Status === "Pending") {
                                                var Gender = result_1.Gender === 'Male' ? 'male' : 'female';
                                                axios({
                                                    method: 'get', url: 'https://www.vilfresh.in/api/employee/create', data: {
                                                        params: {
                                                            "company": result_1.CompanyId,
                                                            "name": result_1.DeliveryPerson_Name,
                                                            "work_phone": result_1.Mobile_Number,
                                                            "work_email": result_1.Email,
                                                            "gender": Gender || '',
                                                            "delivery_line_name": result_1.DeliveryLine.Deliveryline_Name || '',
                                                            "address": result_1.Address || '',
                                                            "area": result_1.Area || '',
                                                            "active": 'True'
                                                        }
                                                    }
                                                }).then(Response => {
                                                    if (Response.data.result.employee_id !== undefined && Response.data.result.employee_id !== null && Response.data.result.employee_id !== '') {
                                                        DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: result_1._id }, { $set: { OdooId: Response.data.result.employee_id } }).exec();
                                                    }
                                                }).catch(errorRes => {
                                                    console.log('Delivery Boy Odoo Create Error');
                                                });
                                            } else {
                                                if (result.DeliveryPerson_Status !== 'Pending') {
                                                    var GenderNew = result_1.Gender === 'Male' ? 'male' : 'female';
                                                    axios({
                                                        method: 'get', url: 'https://www.vilfresh.in/api/employee/update', data: {
                                                            params: {
                                                                "emp_id": result_1.OdooId,
                                                                "company": result_1.CompanyId,
                                                                "name": result_1.DeliveryPerson_Name,
                                                                "work_phone": result_1.Mobile_Number,
                                                                "work_email": result_1.Email,
                                                                "gender": GenderNew || '',
                                                                "delivery_line_name": result_1.DeliveryLine.Deliveryline_Name || '',
                                                                "address": result_1.Address || '',
                                                                "area": result_1.Area || '',
                                                                "active": 'True'
                                                            }
                                                        }
                                                    }).then(Response => {
                                                        //  console.log(Response.data.result);
                                                    }).catch(errorRes => {
                                                        console.log('Delivery Boy Odoo Update Error');
                                                    });
                                                }
                                            }
                                            res.status(200).send({ Status: true, Message: 'Delivery Person Account has been Activated' });
                                        }

                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid Delivery Person Details' });
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


// Delivery boy Status Inactive
exports.User_Update_DeliveryBoy_Inactive = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
    } else {
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
            .exec(function (err, result) {
                if (err) {
                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
                } else {
                    if (result !== null) {
                        DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId }, {}, {})
                            .populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' })
                            .exec(function (err_1, result_1) {
                                if (err_1) {
                                    res.status(417).send({ Status: false, Message: "Some error occurred while Find The Customer Details!.", Error: err_1 });
                                } else {
                                    if (result_1 !== null) {
                                        DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: result_1._id },
                                            {
                                                $set: {
                                                    DeliveryPerson_Status: ReceivingData.DeliveryPerson_Status,
                                                    ApprovedBy_User: ReceivingData.User,
                                                    DeliveryLine: null,
                                                    Session: '',
                                                    CompanyId: result.CompanyId || null,
                                                }
                                            }).exec();
                                        var Gender = result_1.Gender === 'Male' ? 'male' : 'female';
                                        axios({
                                            method: 'get', url: 'https://www.vilfresh.in/api/employee/update', data: {
                                                params: {
                                                    "emp_id": result_1.OdooId,
                                                    "company": result_1.CompanyId,
                                                    "name": result_1.DeliveryPerson_Name,
                                                    "work_phone": result_1.Mobile_Number,
                                                    "work_email": result_1.Email,
                                                    "gender": Gender || '',
                                                    "delivery_line_name": result_1.DeliveryLine.Deliveryline_Name || '',
                                                    "address": result_1.Address || '',
                                                    "area": result_1.Area || '',
                                                    "active": 'False'
                                                }
                                            }
                                        }).then(Response => {
                                            //  console.log(Response.data.result);
                                        }).catch(errorRes => {
                                            console.log('Delivery Boy Odoo Update Error');
                                        });
                                        res.status(200).send({ Status: true, Message: 'Delivery Person Account has been Locked' });
                                    } else {
                                        res.status(417).send({ Status: false, Message: 'Invalid Delivery Person Details' });
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

// Delivery boy Delete
exports.DeliveryBoy_Delete = function (req, res) {
	var ReceivingData = req.body;

	if (!ReceivingData.User || ReceivingData.User === '') {
		res.status(400).send({ Status: false, Message: "User Details can not be empty" });
	} else if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
		res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
	} else {
		ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
		ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
		User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
		.exec(function (err, result) {
			if (err) {
				res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
			} else {
				if (result !== null) {
					var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
					var today = new Date(new Date().setHours(0, 0, 0, 0));
					Promise.all([
						AttendanceManagement.DeliveryPerson_AttendanceSchema.findOne({ DeliveryPersonId: ReceivingData.DeliveryPersonId, Date: today, Session: CurrentSession }, {}, {}).exec(),
						DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }, {}, {}).populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' }).exec()
					]).then(response => {
						var Attendance = response[0];
						var Person = response[1];
						if (Person !== null && Attendance === null) {
							DeliveryPersonModel.DeliveryPersonSchema
							.updateOne({ _id: Person._id }, {
								$set: {
									DeliveryPerson_Status: 'Deleted',
									DeliveryLine: null,
									Active_Status: false,
									If_Deleted: true
								}
							}).exec();
							var Gender = Person.Gender === 'Male' ? 'male' : 'female';
							axios({
								method: 'get', url: 'https://www.vilfresh.in/api/employee/update', data: {
									params: {
										"emp_id": Person.OdooId,
										"company": Person.CompanyId,
										"name": Person.DeliveryPerson_Name,
										"work_phone": Person.Mobile_Number,
										"work_email": Person.Email,
										"gender": Gender || '',
										"delivery_line_name": '',
										"address": Person.Address || '',
										"area": Person.Area || '',
										"active": 'False'
									}
								}
							}).then(Response => {
								//  console.log(Response.data.result);
							}).catch(errorRes => {
								console.log('Delivery Boy Odoo Update Error');
							});
							res.status(200).send({ Status: true, Message: 'Delivery Person Account has been Deleted' });
						} else {
							if (Attendance !== null) {
								var candent = '<b class="color-red"> Unable to Delete</b> <br> <br>  The Delivery person attendance has been created, so please try to delete on the next session before the attendance.';
								res.status(200).send({ Status: false, Alert: true, Message: candent });
							} else {
								res.status(417).send({ Status: false, Message: 'Invalid Delivery Person Details' });
							}
						}
					}).catch( error => {
						res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: error });
					});
				} else {
					res.status(417).send({ Status: false, Message: 'Invalid User Details' });
				}
			}
		});
	}
};


// Deliveryboy Name list for tracking
exports.Deliveryboy_List = function (req, res) {
    var ReceivingData = req.body;
    ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while validate the User Id!.", Error: err });
            } else {
                if (result !== null) {
                    // var currentDate = new Date();
                    // var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
                    // var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
                    // Promise.all([
                    //     OrderManagement.OrderSchema.find({'Region': result.Region, Active_Status: true, If_Deleted: false, $and: [{  DeliveryDate: { $gte: startOfDay } }, {  DeliveryDate: { $lte: endOfDay } } ] })
                    //     .populate({ path: 'DeliveryPerson', select: ['DeliveryPerson_Name', 'Latitude', 'Longitude'] })                    
                    // ]).then(Response => {
                    //     res.status(200).send({ Status: true, Response: Response });
                    //     // var DeliveryPersonDetails = JSON.parse(JSON.stringify(Response[1]));
                    // }).catch(error => {
                    //     res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
                    // });
                    DeliveryPersonModel.DeliveryPersonSchema
                        .find({ 'If_Deleted': false, 'Region': result.Region }, {}, { 'short': { createdAt: 1 } })
                        .exec(function (err_1, result_1) {
                            if (err_1) {
                                res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err_1 });
                            } else {
                                res.status(200).send({ Status: true, Response: result_1 });
                            }
                        });
                } else {
                    res.status(417).send({ Status: false, Message: "This User not present in region", Error: err });
                }
            }
        });
    }
};


// DeliveryPerson Assigned Orders
exports.DeliveryPerson_AssignedOrders = function (req, res) {
    var ReceivingData = req.body;

    ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
    } else {
        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).
                populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' }).exec(),
            OrderManagement.OrderSchema.find({ DeliveryPerson: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false })
                .populate({ path: "CustomerId", select: ['Mobile_Number', 'Customer_Name', 'Address', 'Pincode', 'Latitude', 'Longitude'] })
                .populate({ path: 'Item_Details.ProductId', select: ["Category", "Product_Name"] }).exec(),
        ]).then(Response => {

            var DeliveryPersonDetails = Response[0];

            var OrderDetails = JSON.parse(JSON.stringify(Response[1]));
            if (DeliveryPersonDetails !== null) {
                var DeliveryDetails = [];

                OrderDetails.map(res => {
                    var order = {
                        "OrderId": res._id,
                        "CustomerId": res.CustomerId._id,
                        "Customer_Name": res.CustomerId.Customer_Name,
                        "Mobile_Number": res.CustomerId.Mobile_Number,
                        "Address": res.CustomerId.Address,
                        "Pincode": res.CustomerId.Pincode || '',
                        "Latitude": res.CustomerId.Latitude,
                        "Longitude": res.CustomerId.Longitude,
                        "PaymentMode": res.Payment_Type,
                        "DeliveryDate": moment(res.DeliveryDate).format("DD-MM-YYYY"),
                        "DeliveryStatus": res.OrderDelivered
                    };
                    DeliveryDetails.push(order);
                });

                res.status(200).send({
                    Http_Code: 200,
                    Status: true,
                    Message: "Your Orders Details!",
                    Response: DeliveryDetails
                });
            } else {
                res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid DeliveryPerson Details!" });
            }
        }).catch(error => {
            res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
        });

    }
};


// Available Delivery Person List (Morning, Evening, Both)
exports.Available_DeliveryPersonList = function (req, res) {
    var ReceivingData = req.body;
    var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
    
    if (!ReceivingData.Region || ReceivingData.Region === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Region Details can not be empty" });
    } else {
        ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);

        var currentDate = new Date();
        var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

        Promise.all([
            AttendanceManagement.AttendanceManagementSchema
                .findOne({ Region: ReceivingData.Region, Session: CurrentSession, Date: startOfDay, Active_Status: true, If_Deleted: false })
                .populate({ path: 'LaterPersons', select: 'DeliveryLine' })
                .exec(),
            DeliveryPersonModel.DeliveryPersonSchema
                .find({ Region: ReceivingData.Region, DeliveryPerson_Status: 'Approval', $or:[{Session: CurrentSession}, {Session: 'Both'}],  Active_Status: true, If_Deleted: false })
                .populate({ path: 'DeliveryLine', select: ['Deliveryline_Name', 'Session'] }).exec(),
            AttendanceManagement.DeliveryPerson_AttendanceSchema
                .find({
                    Region: ReceivingData.Region,
                    Session: CurrentSession,
                    Date: startOfDay,
                    Active_Status: true, If_Deleted: false
                }).exec(),
        ]).then(Response => {
            var Attendance = JSON.parse(JSON.stringify(Response[0]));
            var DeliveryPerson = JSON.parse(JSON.stringify(Response[1]));
            var DeliveryPersonAttendance = JSON.parse(JSON.stringify(Response[2]));
            
            DeliveryPerson = DeliveryPerson.filter(obj => {
               const Arr = DeliveryPersonAttendance.filter(objNew => objNew.DeliveryPersonId === obj._id );
               return Arr.length > 0 ? false : true;
            });
            
            var AvailablePersonArr = [];
            if (DeliveryPerson.length !== 0) {
               DeliveryPerson.map(Obj => {
                  AvailablePersonArr.push({
                     "DeliveryPersonId": Obj._id,
                     "DeliveryPerson_Name": Obj.DeliveryPerson_Name,
                     "Mobile_Number": Obj.Mobile_Number,
                     "DeliveryPersonOdooId": Obj.OdooId || null,
                     "DeliveryLineId": Obj.DeliveryLine._id,
                     "DeliveryLine_Name": Obj.DeliveryLine.Deliveryline_Name,
                     "DeliveryLine_Session": Obj.DeliveryLine.Session,
                     "Latitude": Obj.Latitude || null,
                     "Longitude": Obj.Longitude || null
                 });
               });
            }

            res.status(200).send({ Status: true, Message: "Available Delivery Person Details!", Response: AvailablePersonArr });
        }).catch(errorRes => {
            res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


// later Attendance DeliveryPerson List
exports.LaterAttendance_DeliveryPersonList = function (req, res) {
    var ReceivingData = req.body;
    var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';

    if (!ReceivingData.Region || ReceivingData.Region === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Region Details can not be empty" });
    } else {
        ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
        var currentDate = new Date();
        var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

        Promise.all([
            DeliveryPersonModel.DeliveryPersonSchema
                .find({ Region: ReceivingData.Region, LaterAttendance: true, DeliveryPerson_Status: 'Approval', Active_Status: true, If_Deleted: false })
                .populate({ path: 'DeliveryLine', select: ['Deliveryline_Name', 'Session'] }).exec(),
            AttendanceManagement.DeliveryPerson_AttendanceSchema
                .find({
                    Region: ReceivingData.Region,
                    $or: [{ Morning: true },
                    { Morning: null }
                    ],
                    $or: [{ Evening: true },
                    { Evening: null }],
                    $and: [{ Date: { $gte: startOfDay } }, { Date: { $lte: endOfDay } }],
                    Active_Status: true, If_Deleted: false
                }).exec(),
        ]).then(Response => {
            var DeliveryPerson = JSON.parse(JSON.stringify(Response[0]));
            var Attendance = JSON.parse(JSON.stringify(Response[1]));
            DeliveryPerson = DeliveryPerson.filter(obj => {
                const DeliveryPersonArr = Attendance.filter(obj1 => obj1.DeliveryPersonId === obj._id && obj1.Active_Status === true);
                return DeliveryPersonArr.length > 0 ? false : true;

            });

            var AvailablePersonArr = [];

            DeliveryPerson.map(Obj => {
                if (Obj.DeliveryLine.Session === CurrentSession && Obj.DeliveryLine.Session === 'Morning') {
                    AvailablePersonArr.push({
                        "DeliveryPersonId": Obj._id,
                        "DeliveryPerson_Name": Obj.DeliveryPerson_Name,
                        "Mobile_Number": Obj.Mobile_Number,
                        "DeliveryPersonOdooId": Obj.OdooId || null,
                        "DeliveryLineId": Obj.DeliveryLine._id,
                        "DeliveryLine_Name": Obj.DeliveryLine.Deliveryline_Name,
                        "DeliveryLine_Session": Obj.DeliveryLine.Session,
                        "Latitude": Obj.Latitude || null,
                        "Longitude": Obj.Longitude || null
                    });
                } else if (Obj.DeliveryLine.Session === CurrentSession && Obj.DeliveryLine.Session === 'Evening') {
                    AvailablePersonArr.push({
                        "DeliveryPersonId": Obj._id,
                        "DeliveryPerson_Name": Obj.DeliveryPerson_Name,
                        "Mobile_Number": Obj.Mobile_Number,
                        "DeliveryPersonOdooId": Obj.OdooId || null,
                        "DeliveryLineId": Obj.DeliveryLine._id,
                        "DeliveryLine_Name": Obj.DeliveryLine.Deliveryline_Name,
                        "DeliveryLine_Session": Obj.DeliveryLine.Session,
                        "Latitude": Obj.Latitude || null,
                        "Longitude": Obj.Longitude || null
                    });
                } else if (Obj.DeliveryLine.Session === 'Both') {
                    AvailablePersonArr.push({
                        "DeliveryPersonId": Obj._id,
                        "DeliveryPerson_Name": Obj.DeliveryPerson_Name,
                        "Mobile_Number": Obj.Mobile_Number,
                        "DeliveryPersonOdooId": Obj.OdooId || null,
                        "DeliveryLineId": Obj.DeliveryLine._id,
                        "DeliveryLine_Name": Obj.DeliveryLine.Deliveryline_Name,
                        "DeliveryLine_Session": Obj.DeliveryLine.Session,
                        "Latitude": Obj.Latitude || null,
                        "Longitude": Obj.Longitude || null
                    });
                }
            });
            res.status(200).send({ Status: true, Message: "Available Delivery Person Details!", Response: AvailablePersonArr });
        }).catch(errorRes => {
            res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: errorRes });
        });
    }
};


// DeliveryLine Details
exports.DeliveryLines_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
       res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
       ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
       User_Management.UserManagementSchema.findOne({ _id: mongoose.Types.ObjectId(ReceivingData.User) }, {}, {}, function (err, result) {
           if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find the Delivery Line!.", Error: err });
           } else {
               Promise.all([
                   DeliveryPersonModel.DeliveryPersonSchema
                       .find({ Region: result.Region, Active_Status: true, If_Deleted: false })
                       .exec(),
                   DeliverylineModel.Delivery_lineSchema
                       .find({ Region: result.Region, Active_Status: true, If_Deleted: false }, {Deliveryline_Name: 1, Session: 1}, {})
                       .exec(),
               ]).then(Response => {
                   var DeliveryPerson = JSON.parse(JSON.stringify(Response[0]));
                   var DeliveryLine = JSON.parse(JSON.stringify(Response[1]));

                   var TempArr = [];
                   DeliveryLine.map(obj => {
                      if (obj.Session === 'Both') {
                         const NewObjOne = Object.assign({}, obj);
                         NewObjOne.Session = 'Morning';
                         TempArr.push(NewObjOne);
                         const NewObjTwo = Object.assign({}, obj);
                         NewObjTwo.Session = 'Evening';
                         TempArr.push(NewObjTwo);
                      }
                   });
                   DeliveryLine = DeliveryLine.concat(TempArr);
                   DeliveryLine = DeliveryLine.filter(obj => {
                     const DeliveryPersonArr = DeliveryPerson.filter(obj1 => obj1.DeliveryLine === obj._id && obj1.Session === obj.Session);
                     return DeliveryPersonArr.length > 0 ? false : true;
                   });
                   var removableArr = [];
                   DeliveryLine.map(obj => {
                     if (obj.Session === 'Both') {
                        const Arr = DeliveryLine.filter(objNew => objNew._id === obj._id);
                        if (Arr.length < 3) {
                           removableArr.push(JSON.stringify(obj));
                        }
                     }
                     if (obj.Session === 'Morning' || obj.Session === 'Evening') {
                        const Arr = DeliveryLine.filter(objNew => objNew._id === obj._id);
                        const BothAvail =  DeliveryLine.filter(objNew => objNew._id === obj._id && objNew.Session === 'Both');
                        if (Arr.length === 2 && BothAvail.length === 0 ) {
                           removableArr.push(JSON.stringify(obj));
                        }
                     }
                   });

                   DeliveryLine = DeliveryLine.filter(obj => !removableArr.includes(JSON.stringify(obj)) );
                   DeliveryLine.sort((a, b) => a.Deliveryline_Name.localeCompare(b.Deliveryline_Name));
                   res.status(200).send({ Status: true, Response: DeliveryLine });
               }).catch(errorRes => {
                   res.status(417).send({ Status: false, Message: 'Some Occurred Error' });
               });
           }
       });
   }
};




// Attendance based delivery boy name list for tracking
exports.Deliveryboy_List = function (req, res) {
    var ReceivingData = req.body;
    ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);
    if (!ReceivingData.Region || ReceivingData.Region === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        DeliveryPersonModel.DeliveryPersonSchema.find({ Region: ReceivingData.Region, DeliveryPerson_Status: 'Approval', Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Status: false, Message: "Some error occurred while validate the User Id!.", Error: err });
            } else {
                var currentDate = new Date();
                if (result !== null) {
                    Promise.all([
                        OrderManagement.OrderSchema.find({ DeliveryPerson: result._id, DeliveryDate: currentDate, OrderUnDelivered: true }, {}, { 'short': { createdAt: 1 } })
                            .populate({ path: 'DeliveryPerson', select: 'DeliveryPerson_Name' }).exec()
                            .populate({ path: "CustomerId", select: ['Mobile_Number', 'Customer_Name', 'Address', 'Pincode', 'Latitude', 'Longitude'] })
                    ]).then(Response => {
                        var DeliveryPersonDetails = Response[0];
                        var OrderCustomerDetails = JSON.parse(JSON.stringify(Response[1]));

                        if (DeliveryPersonDetails !== null) {
                            res.status(200).send({
                                Http_Code: 200,
                                Status: true,
                                Message: "Deliveryboy Name list!",
                                Response: DeliveryPersonDetails
                            });
                        } else {
                            res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid DeliveryPerson Details!" });
                        }
                    }).catch(error => {
                        res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
                    });

                } else {
                    res.status(200).send({ Http_Code: 418, Status: false, Message: "Invalid deliveryperson !.", Error: err });
                }
                //   if (result !== null) {
                //     OrderManagement.OrderSchema.find({ DeliveryPerson: result._id, DeliveryDate: currentDate, OrderUnDelivered: true }, { }, { 'short': { createdAt: 1 } }).exec(function(err_1, result_1 ) {
                //         if (err_1) {
                //             res.status(417).send({ status: false, ErrorCode: 417, Message: "Some error occurred!.", Error: err_1 });
                //          } else {
                //             res.status(200).send({ Status: true, Response: result_1 });
                //         }
                //     });

                //   } else {
                //     res.status(418).send({ status: false, ErrorCode: 418, Message: "Delivery person not get!.", Error: err });
                //   }

            }
        });
    }
};




