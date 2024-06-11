var Attendance = require('../../api/models/attendance_management.model');
var UserManagement = require('../../api/models/user_management.model');
var DeliveryPersonManagement = require('../../mobile_api/models/deliveryPerson_details.model');
var User_Management = require('../../api/models/user_management.model');
var DeliveryPersonModel = require('../../mobile_api/models/deliveryPerson_details.model');
var mongoose = require('mongoose');
var moment = require('moment');
const axios = require('axios');


// Attendance Create
exports.Attendance_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.AttendanceDetails || ReceivingData.AttendanceDetails === []) {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {        
        ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
        var Persons = [];
        ReceivingData.AttendanceDetails = ReceivingData.AttendanceDetails.map(Obj => {
            Obj.DeliveryPersonId = mongoose.Types.ObjectId(Obj.DeliveryPersonId);
            Obj.DeliveryLineId = mongoose.Types.ObjectId(Obj.DeliveryLineId);
            Persons.push(Obj.DeliveryPersonId);
            return Obj;
        });
        var LaterPersons = [];
        if (ReceivingData.AttendanceDetailsCancel.length !== 0) {
            ReceivingData.AttendanceDetailsCancel.map(obj => {
                obj.DeliveryPersonId = mongoose.Types.ObjectId(obj.DeliveryPersonId);
                LaterPersons.push(obj.DeliveryPersonId);
            });
        }
        const Today = new Date(new Date().setHours(0, 0, 0, 0));
        Promise.all([
            UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec(),
            Attendance.DeliveryPerson_AttendanceSchema.find({ Date: Today }).exec(),            
        ]).then(response => {
            var resultUser = response[0];            
            if (resultUser !== null) {
                var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
                var NewAttendance = [];
                                                
                ReceivingData.AttendanceDetails.map(obj => {
                     var CreateAttendance = new Attendance.DeliveryPerson_AttendanceSchema({
                           DeliveryPersonId: obj.DeliveryPersonId,
                           Date: new Date(new Date().setHours(0, 0, 0, 0)),
                           DeliveryLineId: obj.DeliveryLineId,
                           DeliveryLineSession: obj.DeliveryLine_Session,
                           Session: obj.Session,
                           Morning: CurrentSession === 'Morning' ? obj.Present : null,
                           Evening: CurrentSession === 'Evening' ? obj.Present : null,                            
                           MorningUpdatedBy: CurrentSession === 'Morning' ? ReceivingData.User : null,
                           EveningUpdatedBy: CurrentSession === 'Evening' ? ReceivingData.User : null,
                           Region: resultUser.Region,
                           Active_Status: true,
                           If_Deleted: false
                     });
                     NewAttendance.push(CreateAttendance);
                    if (obj.Present === true && obj.DeliveryPersonOdooId !== null && CurrentSession === 'Morning') {
                        axios({
                            method: 'get', url: 'https://www.vilfresh.in/api/attendance/create', data: {
                                params: {
                                    "employee_id": obj.DeliveryPersonOdooId,
                                    "check_in": moment(new Date(new Date().setHours(0, 0, 0, 0))).format('DD-MM-YYYY HH:mm:ss'),
                                    "check_out": moment(new Date(new Date().setHours(4, 0, 0, 0))).format('DD-MM-YYYY HH:mm:ss'),
                                }
                            }
                        });
                    }
                    if (obj.Present === true && obj.DeliveryPersonOdooId !== null && CurrentSession === 'Evening') {
                        axios({
                            method: 'get', url: 'https://www.vilfresh.in/api/attendance/create', data: {
                                params: {
                                    "employee_id": obj.DeliveryPersonOdooId,
                                    "check_in": moment(new Date(new Date().setHours(12, 0, 0, 0))).format('DD-MM-YYYY HH:mm:ss'),
                                    "check_out": moment(new Date(new Date().setHours(16, 0, 0, 0))).format('DD-MM-YYYY HH:mm:ss'),
                                }
                            }
                        });
                    }
                });
                Attendance.AttendanceManagementSchema.findOne({'Date': Today, Session: CurrentSession, ApprovedBy: ReceivingData.User, 'If_Deleted': false, 'Region': resultUser.Region }, { }, { 'short': { createdAt: 1 } }).exec(( errAttendance, resResponse) => {
                    if (errAttendance) {
                       res.status(417).send({ Status: false, Message: "Some error occurred while Find the Session Attendance!.", Error: errAttendance });
                    } else {
                        if (resResponse !== null) {                                                       
                            Attendance.AttendanceManagementSchema.updateOne(
                                { _id: resResponse._id },
                                { $set: { LaterPersons : LaterPersons } }
                            ).exec();
                        } else {
                            var AttendanceManagement = new Attendance.AttendanceManagementSchema({
                                Date: new Date(new Date().setHours(0, 0, 0, 0)),
                                LaterPersons: LaterPersons,
                                Session: CurrentSession,
                                ApprovedBy: ReceivingData.User,
                                Region: resultUser.Region,
                                Active_Status: true,
                                If_Deleted: false
                            });
                            AttendanceManagement.save();
                        }
                     }
                });
                                
                Promise.all([
                    NewAttendance.map(obj => obj.save()),                    
                ]).then(response => {                                        
                    res.status(200).send({ Status: true, Message: "DeliveryPerson Attendance SuccessFully Updated!." });
                }).catch(error => {
                    res.status(417).send({ Status: false, Message: "Some Occurred Error!." });
                });
            } else {
                res.status(417).send({ Status: false, Message: "Invalid User Details!." });
            }
        }).catch(error => {

        });
    }
};

//DeliveryPerson Attendance List
exports.DeliveryPerson_AttendanceList = function (req, res) {
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
                    var date = new Date();

                    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    var Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                    var Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

                    var ShortOrder = { createdAt: -1 };
                    var ShortKey = ReceivingData.ShortKey;
                    var ShortCondition = ReceivingData.ShortCondition;
                    if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                        ShortOrder = {};
                        ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                    }
                    var FindQuery = {
                        'If_Deleted': false,
                        'Region': result.Region,
                        'DeliveryPerson_Status': 'Approval'
                    };
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
                        DeliveryPersonManagement.DeliveryPersonSchema
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
                                { $unwind: "$DeliveryLine" },
                                {
                                    $lookup: {
                                        from: "DeliveryPerson_Attendance",
                                        let: { "person": "$_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: { $eq: ["$$person", "$DeliveryPersonId"] },
                                                    $and: [{ Date: { $gte: firstDay } },
                                                    { Date: { $lte: lastDay } }]
                                                }
                                            },
                                            { $project: { "DeliveryLineSession": 1, "Morning": 1, "Evening": 1 } }
                                        ],
                                        as: 'AttendanceInfo'
                                    }
                                },
                                { $addFields: { AttendanceInfo: { $ifNull: ["$AttendanceInfo", null] } } },
                                { $addFields: { DeliverylineNameSort: { $ifNull: ["$DeliveryLine.Deliveryline_Name", null] } } },
                                { $addFields: { DeliverylineNameSort: { $toLower: "$DeliverylineNameSort" } } },
                                { $addFields: { DeliveryPerson_NameSort: { $toLower: "$DeliveryPerson_Name" } } },
                                {
                                    $project: {
                                        DeliveryPerson_Name: 1,
                                        Mobile_Number: 1,
                                        DeliveryLine: 1,
                                        AttendanceInfo: 1,
                                        createdAt: 1,
                                        DeliveryPerson_NameSort: 1,
                                        DeliverylineNameSort: 1,
                                    }
                                },
                                { $sort: ShortOrder },
                                { $skip: Skip_Count },
                                { $limit: Limit_Count }
                            ]).exec(),
                        DeliveryPersonManagement.DeliveryPersonSchema.find(FindQuery).exec()
                    ]).then(result => {
                        var Attendance = JSON.parse(JSON.stringify(result[0]));
                        Attendance = Attendance.map(Obj => {
                            Obj.TotalNoOfPresent = 0;
                            Obj.TotalNoOfAbsent = 0;

                            Obj.AttendanceInfo.map(Obj1 => {
                                if (Obj1.Morning === true) {
                                    Obj.TotalNoOfPresent++;
                                }
                                if (Obj1.Morning === false) {
                                    Obj.TotalNoOfAbsent++;
                                }
                                if (Obj1.Evening === true) {
                                    Obj.TotalNoOfPresent++;
                                }
                                if (Obj1.Evening === false) {
                                    Obj.TotalNoOfAbsent++;
                                }
                            });
                            return Obj;
                        });
                        if (ShortKey && ShortKey === 'TotalNoOfPresent' && ShortCondition && ShortCondition !== 'Descending') {
                            Attendance = Attendance.sort((a, b) => (a.TotalNoOfPresent > b.TotalNoOfPresent) ? 1 : ((b.TotalNoOfPresent > a.TotalNoOfPresent) ? -1 : 0));
                        }
                        if (ShortKey && ShortKey === 'TotalNoOfPresent' && ShortCondition && ShortCondition !== 'Ascending') {
                            Attendance = Attendance.sort((a, b) => (a.TotalNoOfPresent > b.TotalNoOfPresent) ? -1 : ((b.TotalNoOfPresent > a.TotalNoOfPresent) ? 1 : 0));
                        }
                        if (ShortKey && ShortKey === 'TotalNoOfAbsent' && ShortCondition && ShortCondition !== 'Descending') {
                            Attendance = Attendance.sort((a, b) => (a.TotalNoOfAbsent > b.TotalNoOfAbsent) ? 1 : ((b.TotalNoOfAbsent > a.TotalNoOfAbsent) ? -1 : 0));
                        }
                        if (ShortKey && ShortKey === 'TotalNoOfAbsent' && ShortCondition && ShortCondition !== 'Ascending') {
                            Attendance = Attendance.sort((a, b) => (a.TotalNoOfAbsent > b.TotalNoOfAbsent) ? -1 : ((b.TotalNoOfAbsent > a.TotalNoOfAbsent) ? 1 : 0));
                        }
                        res.status(200).send({ Status: true, Message: 'Delivery Person Attendance List', Response: Attendance, SubResponse: result[1].length });

                    }).catch(error => {
                        res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Delivery Person Details list!." });
                    });
                } else {
                    res.status(200).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
                }
            }
        });
    }
}; 

// Session Validate for Attendance Generate
exports.Attendance_SessionValidate = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.Region || ReceivingData.Region === '') {
        res.status(417).send({ Status: false, Message: "Region can not be empty" });
    } else if (!ReceivingData.CurrDate || ReceivingData.CurrDate === '') {
        res.status(400).send({ Status: false, Message: "CurrDate can not be empty" });
    } else if (!ReceivingData.Session || ReceivingData.Session === '') {
        res.status(400).send({ Status: false, Message: "Session can not be empty" });
    } else {
        ReceivingData.Region = mongoose.Types.ObjectId(ReceivingData.Region);

        ReceivingData.Date = new Date(new Date(ReceivingData.CurrDate).setHours(0, 0, 0, 0));

        Attendance.AttendanceManagementSchema
            .findOne({ Date: ReceivingData.Date, Region: ReceivingData.Region, Session: ReceivingData.Session }, { Session: 1 }, {})
            .exec((err, result) => {
                res.status(200).send({ Http_Code: 200, Status: true, Response: result });
            });
    }
};

//Month Wise Delivery Boy Attendance List view
exports.MonthWise_Attendance_List = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(417).send({ Status: false, Message: "DeliveryPerson Id can not be empty" });
    } else if (!ReceivingData.From || ReceivingData.From === '') {
        res.status(400).send({ Status: false, Message: "From Date of Month can not be empty" });
    } else if (!ReceivingData.To || ReceivingData.To === '') {
        res.status(400).send({ Status: false, Message: "To Date of Month can not be empty" });
    } else {
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);

        var DateFrom = new Date(ReceivingData.From);
        var DateTo = new Date(DateFrom.getFullYear(), DateFrom.getMonth() + 1, 1);

        DeliveryPersonManagement.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId }, { Region: 1 }, {}).exec((err_1, result_1) => {
            if (err_1) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
            } else {
                Attendance.DeliveryPerson_AttendanceSchema
                    .find({ DeliveryPersonId: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false, $and: [{ Date: { $gte: DateFrom } }, { Date: { $lte: DateTo } }] },
                        {  DeliveryLineSession: 1, Morning: 1, Evening: 1, Date: 1},
                        { sort: { createdAt: -1 } })
                     .populate({ path: 'DeliveryLineId', select: ['Deliveryline_Name', 'Session'] })
                    .exec((err, result) => {
                        if (err) {
                            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Attendance list !.", Error: err });
                        } else {
                           const DuplicateDates = [];
                           const FinalData = [];
                           result.map(obj => {
                              if (!DuplicateDates.includes(new Date(obj.Date).valueOf())) {
                                 const Arr = result.filter(objNew => new Date(objNew.Date).valueOf() === new Date(obj.Date).valueOf());
                                 if (Arr.length > 1) {
                                    const MorObj = Arr[0].Morning !== null ? Arr[0] : Arr[1];
                                    const EveObj = Arr[0].Evening !== null ? Arr[0] : Arr[1];
                                    MorObj.Evening = EveObj.Evening;
                                    obj = MorObj;
                                    DuplicateDates.push(new Date(obj.Date).valueOf());
                                 }
                                 FinalData.push(obj);
                              } 
                           });
                           res.status(200).send({ Http_Code: 200, Status: true, Response: FinalData, result: result });
                        }
                    });
            }
        });
    }
};


//Today Presented Delivery Persons
exports.TodayPresent_DeliveryPersons = function (req, res) {
    var ReceivingData = req.body;

    if (!ReceivingData.User || ReceivingData.User === '') {
        res.status(400).send({ Status: false, Message: "User Details can not be empty" });
    } else {
        User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}, function (err, result) {
            if (err) {
                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the User Management!.", Error: err });
            } else {
                if (result !== null) {
                    const Today = new Date(new Date().setHours(0, 0, 0, 0));
                    const CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
                    const FindQuery = { Active_Status: true, Region: result.Region, Date: Today };
                    FindQuery[CurrentSession] = true;
                    Attendance.DeliveryPerson_AttendanceSchema
                        .find(FindQuery, { DeliveryPersonId: 1 }, {})
                        .populate({ path: 'DeliveryPersonId', select: ['DeliveryPerson_Name', 'DeliveryLine'], populate: { path: 'DeliveryLine', select: 'Deliveryline_Name' } })
                        .exec((err_1, result_1) => {
                            if (err_1) {
                                res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the DeliveryPersons!.", Error: err });
                            } else {

                                result_1 = JSON.parse(JSON.stringify(result_1));
                                result_1 = result_1.map(obj => obj.DeliveryPersonId);
                                result_1 = result_1.map(obj => {
                                    obj.Deliveryline_Name = obj.DeliveryLine.Deliveryline_Name;
                                    delete obj.DeliveryLine;
                                    return obj;
                                });
                                res.status(200).send({ Http_Code: 200, Status: true, Response: result_1 });
                            }
                        });
                } else {
                    res.status(400).send({ Http_Code: 400, Status: true, Message: 'Invalid User Details' });
                }
            }
        });
    }
};

// Later DeliveryPerson Attendance Update

exports.LaterDeliveryPersonAttendanceUpdate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
    } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Name is required field" });
    } else {
        ReceivingData.DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine);
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        DeliveryPersonModel.DeliveryPersonSchema.findOne({
            _id: ReceivingData.DeliveryPersonId,
            DeliveryLine: ReceivingData.DeliveryLine, Active_Status: true, If_Deleted: false
        }).exec((err_5, result_1) => {
            if (err_5) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err });
            } else {
                if (result_1 !== null) {
                    DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: ReceivingData.DeliveryPersonId },
                        {
                            $set: {
                                LaterAttendance: true
                            }
                        }).exec();  
                        res.status(200).send({ Status: true, Message: "Later DeliveryPerson Attendance Update!" });                         
                        
                } else {
                    res.status(400).send({ Status: false, Message: "Invalid Delivery Person Details!" });
                }
            }
        });
    }
};

// Later DeliveryPerson Attendance
exports.LaterAttendanceUpdate = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
        res.status(400).send({ Status: false, Message: "Delivery Person Details can not be empty" });
    } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery Person Name is required field" });
    } else {
        ReceivingData.DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine);
        ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
        DeliveryPersonModel.DeliveryPersonSchema.findOne({
            _id: ReceivingData.DeliveryPersonId,
            DeliveryLine: ReceivingData.DeliveryLine, Active_Status: true, If_Deleted: false
        }).exec((err_5, result_1) => {
            if (err_5) {
                res.status(417).send({ Status: false, Message: "Some error occurred while Find The Delivery Person Details!.", Error: err });
            } else {
                if (result_1 !== null) {                    
                    DeliveryPersonModel.DeliveryPersonSchema.updateOne({ _id: ReceivingData.DeliveryPersonId },
                        {
                            $set: {
                                LaterAttendance: false
                            }
                        }).exec();  
                        res.status(200).send({ Status: true, Message: "Later DeliveryPerson Attendance Update!" });
                      } else {
                    res.status(400).send({ Status: false, Message: "Invalid Delivery Person Details!" });
                }
            }
        });
    }
};