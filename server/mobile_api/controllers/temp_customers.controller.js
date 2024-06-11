var Temp_Customers = require('../../mobile_api/models/temp_customers.model');
var Banner_Management = require('../../mobile_api/models/banner_management.model');
var Region_Management = require('../../api/models/region_management.model');
var product_management = require('../../api/models/product_management.model');
var mongoose = require('mongoose');
var moment = require('moment');


exports.DeviceRegister = function (req, res) {
	var ReceivingData = req.body;
	if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
		res.status(400).send({ Http_Code: 400, Status: false, Message: "Mobile Number can not be empty" });
	} else {
		var Region = ReceivingData.Region && ReceivingData.Region !== '' && ReceivingData.Region !== null ? mongoose.Types.ObjectId(ReceivingData.Region) : null;
		var DeviceType = ReceivingData.Device_Type && ReceivingData.Device_Type !== '' && ReceivingData.Device_Type !== null ? ReceivingData.Device_Type : '';
		Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }).exec((err, result) => {
			if (err) {
				res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
			} else {
				if (result === null) {
					var newTempCustomer = new Temp_Customers.TempCustomersSchema({
						DeviceId: ReceivingData.DeviceId,
						Region: Region,
						Device_Type: DeviceType,
						Active_Status: true,
						If_Deleted: false,
					});
					newTempCustomer.save((err_2, result_2) => {
						if (err_2) {
							res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
						} else {
							res.status(200).send({ Http_Code: 200, Status: true, Message: "Device Registered!" });
						}
					});
				} else {
					if (JSON.parse(JSON.stringify(result.Region)) !== JSON.parse(JSON.stringify(Region)) ) {
						Temp_Customers.TempCartSchema.updateMany({TempCustomer: result._id }, {$set: { Active_Status: false, If_Deleted: true} });
					}
					result.Region = Region;
					result.save((err_2, result_2) => {
						if (err_2) {
							res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
						} else {
							res.status(200).send({ Http_Code: 200, Status: true, Message: "Device Registered!" });
						}
					});
				}
			}
		});
	}
};

exports.Device_BannersList = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(200).send({ Status: false, Http_Code: 400, Message: "Device Details can not be empty" }); 
   } else {
		Promise.all([
			Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }).exec(),
			Region_Management.RegionManagementSchema.findOne({ Active_Status: true, If_Deleted: false}).exec()
		]).then(response => {
			var DeviceData = response[0];
			var RegionData = response[1];
			var Region = (DeviceData !== null && DeviceData.Region && DeviceData.Region !== null) ? DeviceData.Region : RegionData !== null ? RegionData._id : null;
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
				{ $match: { $expr: { $eq: ["$Region", Region] } } },
				{ $project: { File_Name: 1, Title: 1 , Description: 1, createdAt: 1, updatedAt: 1 } },
			]).exec( (error, response) => {
				if (error) {
					res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
				} else {
					res.status(200).send({  Http_Code: 200, Success: true, Message: "Success", Response: response });
				}
			});
		});

   }
};

exports.ProductManagement_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      Promise.all([
         Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {}).populate('Region').exec(),
			Region_Management.RegionManagementSchema.findOne({ Active_Status: true, If_Deleted: false}).exec()
      ]).then(Response => {
         var DeviceDetails = Response[0];
			var RegionData = Response[1];
			var CompanyId = (DeviceDetails.Region !== null && DeviceDetails.Region.CompanyId && DeviceDetails.Region.CompanyId !== '') ? DeviceDetails.Region.CompanyId : RegionData !== null ? RegionData.CompanyId : null; 
         if (DeviceDetails !== null) {
            product_management.ProductManagementSchema.find({ CompanyId: CompanyId, Milk_YesOrNo: false, Active_Status: true, If_Deleted: false }, {}, {sort: {createdAt: -1}})
				.exec((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
               } else {
                  var Farm_To_Home = [];
                  var Factory_To_Home = [];
                  var Home_To_Home = [];
                  var Category_Wise = result_1;
                  // Category_Wise      
                  Category_Wise.map(obj => {
                     if (obj.Current_Stock > 0 || obj.Stackable === false) {
                        if (obj.Category === 'Factory_To_Home') {
                           Factory_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        } else if (obj.Category === 'Farm_To_Home') {
                           Farm_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        } else if (obj.Category === 'Home_To_Home') {
                           Home_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        }
                     }
                  });
                  Temp_Customers.TempCartSchema.find({ TempCustomer: DeviceDetails._id, Active_Status: true, If_Deleted: false })
						.exec((err_2, result_2) => {
							if (err_2) {
								res.status(417).send({ Success: false, Message: "Some error occurred!." });
							} else {
								res.status(200).send({
									Http_Code: 200, Status: true,
									Message: "Products List",
									Response: [{
										MyCart_Count: result_2.length,
										Factory_To_Home: Factory_To_Home,
										Farm_To_Home: Farm_To_Home,
										Home_To_Home: Home_To_Home
									}]
								});
							}
						});
               }
            });
         } else {
            res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Device Details" });
         }
      }).catch(Error => {
			res.status(417).send({ Success: false, Message: "Some error occurred!." });
      });
   }
};

exports.Farm_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      Promise.all([
         Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {}).populate('Region').exec(),
			Region_Management.RegionManagementSchema.findOne({ Active_Status: true, If_Deleted: false}).exec()
		]).then(Response => {
         var DeviceDetails = Response[0];
			var RegionData = Response[1];
			var CompanyId = (DeviceDetails.Region !== null && DeviceDetails.Region.CompanyId && DeviceDetails.Region.CompanyId !== '') ? DeviceDetails.Region.CompanyId : RegionData !== null ? RegionData.CompanyId : null; 
         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CompanyId, Active_Status: true, Milk_YesOrNo: false, Category: "Farm_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "Temp_Cart",
                        let: { id: "$_id", customer: DeviceDetails._id },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$TempCustomer"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "TempCustomer": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Stackable: 1, Current_Stock: 1, Price: 1, Description: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
         ]).then(response => {
            var Products = response[0];
            var Farm_To_Home = [];
            Products.map(product => {
               var Days = [];
               const Static_day = new Date(new Date().setDate(new Date().getDate() + 1));
					var Current_Days = new Date(Static_day.setHours(11, 0, 0, 0)).valueOf();
					if (product.Stackable) {
                  Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               }
               var curr = new Date(new Date().setDate(new Date().getDate() + 1));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 1));

					if (Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf()) {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate()));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
					} else {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate() + 1));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
					}

               var Dates = [];

               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                   // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }

               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var ReturnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };
               Farm_To_Home.push(ReturnObj);
            });
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: Farm_To_Home });
         }).catch(error => {
            console.log(error);
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });

   }
};

exports.Factory_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      Promise.all([
         Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {}).populate('Region').exec(),
			Region_Management.RegionManagementSchema.findOne({ Active_Status: true, If_Deleted: false}).exec()
		]).then(Response => {
         var DeviceDetails = Response[0];
			var RegionData = Response[1];
			var CompanyId = (DeviceDetails.Region !== null && DeviceDetails.Region.CompanyId && DeviceDetails.Region.CompanyId !== '') ? DeviceDetails.Region.CompanyId : RegionData !== null ? RegionData.CompanyId : null; 
         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CompanyId, Active_Status: true, Milk_YesOrNo: false, Category: "Factory_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "Temp_Cart",
                        let: { id: "$_id", customer: DeviceDetails._id },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$TempCustomer"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "TempCustomer": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Stackable: 1, Current_Stock: 1, Price: 1, Description: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
         ]).then(response => {
            var Products = response[0];
            var Factory_To_Home = [];
            Products.map(product => {
               var Days = [];
               const Static_day = new Date(new Date().setDate(new Date().getDate() + 1));
					var Current_Days = new Date(Static_day.setHours(11, 0, 0, 0)).valueOf();
					if (product.Stackable) {
                  Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               }
               var curr = new Date(new Date().setDate(new Date().getDate() + 1));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 1));

					if (Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf()) {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate()));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
					} else {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate() + 1));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
					}

               var Dates = [];

               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                   // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }

               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var ReturnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };
               Factory_To_Home.push(ReturnObj);
            });
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: Factory_To_Home });
         }).catch(error => {
            console.log(error);
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });

   }
};

exports.Home_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
      Promise.all([
         Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {}).populate('Region').exec(),
			Region_Management.RegionManagementSchema.findOne({ Active_Status: true, If_Deleted: false}).exec()
		]).then(Response => {
         var DeviceDetails = Response[0];
			var RegionData = Response[1];
			var CompanyId = (DeviceDetails.Region !== null && DeviceDetails.Region.CompanyId && DeviceDetails.Region.CompanyId !== '') ? DeviceDetails.Region.CompanyId : RegionData !== null ? RegionData.CompanyId : null; 
         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CompanyId, Active_Status: true, Milk_YesOrNo: false, Category: "Home_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "Temp_Cart",
                        let: { id: "$_id", customer: DeviceDetails._id },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$TempCustomer"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "TempCustomer": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Stackable: 1, Current_Stock: 1, Price: 1, Description: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
         ]).then(response => {
            var Products = response[0];
            var Home_To_Home = [];
            Products.map(product => {
               var Days = [];
               const Static_day = new Date(new Date().setDate(new Date().getDate() + 2));
               var Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               var curr = new Date(new Date().setDate(new Date().getDate() + 2));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 2));
					if (Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf()) {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate()));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
					} else {
						curr.setHours(0, 0, 0, 0);
						curr = new Date(curr.setDate(curr.getDate() + 1));
						curr_1.setHours(0, 0, 0, 0);
						curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
					}

               var Dates = [];

               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                   // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }

               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var ReturnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };
               Home_To_Home.push(ReturnObj);
            });
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: Home_To_Home });
         }).catch(error => {
            console.log(error);
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });

   }
};

exports.Products_Added_to_MyCart = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.ProductId || ReceivingData.ProductId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Product ID can not be empty" });
   } else if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else if (!ReceivingData.Product_Key || ReceivingData.Product_Key === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Product Key can not be empty" });
   } else {
      ReceivingData.ProductId = mongoose.Types.ObjectId(ReceivingData.ProductId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();

		Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {})
		.exec((err, result) => {
			if (err) {
				res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
			} else {
				if (result !== null) {
					if (ReceivingData.Product_Key === 'Added_To_MyCart') {
						var MyCartCreate = new Temp_Customers.TempCartSchema({
							ProductId: ReceivingData.ProductId,
							TempCustomer: result._id,
							Date: ReceivingData.Date,
							Quantity: ReceivingData.Quantity,
							Active_Status: true,
							If_Deleted: false,
						});
						MyCartCreate.save(function (err_1, result_1) {
							if (err_1) {
								res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
							} else {
								res.status(200).send({ Http_Code: 200, Status: true, Message: 'Added to Cart', Response: result_1 });
							}
						});
					} else if (ReceivingData.Product_Key === 'Update_To_MyCart') {
						Temp_Customers.TempCartSchema.find({ ProductId: ReceivingData.ProductId, TempCustomer: result._id, Active_Status: true, If_Deleted: false }, {}, {sort: {Date: -1}}).exec((err_2, result_2) => {
							if (err_2) {
								res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
							} else {
								if (result_2[0] !== null) {
									result_2[0].Date = ReceivingData.Date;
									result_2[0].Quantity = ReceivingData.Quantity;
									result_2[0].save(function (err_3, result_3) {
										if (err_3) {
											res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
										} else {
											res.status(200).send({ Http_Code: 200, Status: true, Message: 'Update to Cart', Response: result_2[0] });
										}
									});
								} else {
									res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Cart Details!" });
								}
							}
						});
					} else {
						Temp_Customers.TempCartSchema.updateOne({
							ProductId: ReceivingData.ProductId,
							TempCustomer: result._id,
							Active_Status: true,
							If_Deleted: false
						}, { $set: { If_Deleted: true, Quantity: 0 } })
						.exec(function (err_3, result_3) {
							if (err_3) {
								res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred!"});
							} else {
								res.status(200).send({ Http_Code: 200, Success: true, Message: 'Cart Detail Deleted' });
							}
						});
					}
				} else {
					res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Device Details!" });
				}
			}
		});
   }
};

exports.All_MyCart_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Device Details can not be empty" });
   } else {
		Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {})
		.exec((err, result) => {
			if (err) {
				res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
			} else {
				if (result !== null) {
					Promise.all([
						Temp_Customers.TempCartSchema.find({ TempCustomer: result._id, Active_Status: true, If_Deleted: false }, {}, {}).populate({ path: "ProductId" }).exec()
					]).then(response => {
						var CartList = response[0];
						var MyCartDetails = [];
						CartList.map(obj => {
							var Stock_Available = false;
							if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
								Stock_Available = true;
							}
							var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));
							var validationDate = new Date(new Date().setDate(new Date(CurrentDate).getDate() + 1)).valueOf();
							var DeliveryDateExceed = false;
							const ReqDate = new Date(obj.Date).valueOf();
							if (obj.ProductId.Category === "Home_To_Home") {
								validationDate = new Date(new Date().setDate(new Date(CurrentDate).getDate() + 2)).valueOf();
							}
							if (ReqDate === validationDate) {
								if (obj.ProductId.Category === "Home_To_Home") {
									DeliveryDateExceed = new Date().getHours() < 20 ? false : true ;
								} else {
									if (obj.ProductId.Stackable) {
										DeliveryDateExceed = new Date().getHours() < 20 ? false : true ;
									} else {
										DeliveryDateExceed = new Date().getHours() < 11 ? false : true ;
									}
								}
							} else if (ReqDate < validationDate) {
								DeliveryDateExceed = true;
							}
							MyCartDetails.push({
								ProductId: obj.ProductId._id,
								MyCartId: obj._id,
								Category: obj.ProductId.Category,
								Product_Name: obj.ProductId.Product_Name,
								Image: obj.ProductId.File_Name,
								Date: moment(obj.Date).format("YYYY-MM-DD"),
								DeliveryDateExceed: DeliveryDateExceed,
								Price: obj.ProductId.Price,
								BasicUnitQuantity: obj.ProductId.BasicUnitQuantity || 0,
								Unit: obj.ProductId.Unit,
								Stackable: obj.ProductId.Stackable,
								Current_Stock: obj.ProductId.Current_Stock,
								Quantity: obj.Quantity,
								Stock_Available: Stock_Available
							});
						});
						res.status(200).send({
							Http_Code: 200,
							Status: true,
							Message: "Cart List Details!",
							Response: MyCartDetails
						});
					}).catch(error => {
						res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred!" });
					});
				} else {
					res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Device Details!" });
				}
			}
		});
   }
};

exports.MyCartDetails_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.ProductId || ReceivingData.ProductId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Product Details can not be empty" });
   } else if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Device Details can not be empty" });
   } else {
      ReceivingData.ProductId = mongoose.Types.ObjectId(ReceivingData.ProductId);
		Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {})
		.exec((err, result) => {
			if (err) {
				res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
			} else {
				if (result !== null) {
					Temp_Customers.TempCartSchema.updateMany({ ProductId: ReceivingData.ProductId, TempCustomer: result._id, If_Deleted: false }, { $set: { If_Deleted: true } })
					.exec(function (err_1, result_1) {
						if (err_1) {
							res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred!" });
						} else {
							res.status(200).send({ Http_Code: 200, Success: true, Message: 'Cart Details Deleted' });
						}
					});
				} else {
					res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Device Details!" });
				}
			}
		});
   }
};


exports.MyCart_TotalAmount = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.DeviceId || ReceivingData.DeviceId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Device Details can not be empty" });
   } else {
		Temp_Customers.TempCustomersSchema.findOne({ DeviceId: ReceivingData.DeviceId, Active_Status: true, If_Deleted: false }, {}, {})
		.exec((err, result) => {
			if (err) {
				res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!" });
			} else {
				if (result !== null) {
					Temp_Customers.TempCartSchema.find({ TempCustomer: result._id, Active_Status: true, If_Deleted: false })
					.populate({ path: 'ProductId', select: 'Price' }).exec((err_5, result) => {
						if (err_5) {
							res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!." });
						} else {
							if (result.length !== 0) {
								var Total_amount = 0;
								var Quantity_Total = 0;
								result.map(Obj => {
									Total_amount = Math.round((Total_amount + Obj.ProductId.Price * Obj.Quantity) * 100) / 100;
									Quantity_Total = Math.round((Quantity_Total + Obj.Quantity) * 100) / 100;
								});
								res.status(200).send({ Http_Code: 200, Success: true, Message: 'Cart Total Count & Amount', TotalAmount: Total_amount, QuantityTotal: Quantity_Total });
							} else {
								res.status(200).send({ Http_Code: 404, Success: false, Message: 'Invalid Cart Details ' });
							}
						}
					});
				} else {
					res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Device Details!" });
				}
			}
		});
   }
};