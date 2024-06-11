var ProductManagement = require('../../models/product_management.model');
var mongoose = require('mongoose');
var multer = require('multer');
var path = require('path');
var fs = require('fs');


// Product Management System ---------------------------------------------
exports.ProductManagement_Create = function (req, res) {
    var ReceivingData = req.body;
    if (!ReceivingData.Category || ReceivingData.Category === '') {
        res.status(400).send({ Status: false, Message: "Category Name can not be empty" });
    } else if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
        res.status(400).send({ Status: false, Message: "Products Details is required" });
    } else {
      ProductManagement.ProductManagementSchema.findOne({ OdooId: ReceivingData.OdooId }, {}, {}, function (err, result) {
         if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product Management!.", Error: err });
         } else {
            if (result === null) { 
               var StockStatus;
               var Stackable;
               if (ReceivingData.type === 'product') {
                  StockStatus = 'Stock_Available';
                  Stackable = true;
               } else if (ReceivingData.type === 'consu') {
                  StockStatus = 'Consumable';
                  Stackable = false;
               }

               const Create_Product = new ProductManagement.ProductManagementSchema({
                  Category: ReceivingData.Category,
                  "Sub_Category.Name": ReceivingData.Sub_Category.Name || null,
                  "Sub_Category.Parent_Name": ReceivingData.Sub_Category.Parent_Name || null,
                  Product_Name: ReceivingData.Product_Name,
                  BasicUnitQuantity: ReceivingData.BasicUnitQuantity,
                  Price: ReceivingData.Price,
                  Unit: ReceivingData.Unit,
                  "Schedule.Sunday": ReceivingData.Schedule.Sunday || false,
                  "Schedule.Monday": ReceivingData.Schedule.Monday || false,
                  "Schedule.Tuesday": ReceivingData.Schedule.Tuesday || false,
                  "Schedule.Wednesday": ReceivingData.Schedule.Wednesday || false,
                  "Schedule.Thursday": ReceivingData.Schedule.Thursday || false,
                  "Schedule.Friday": ReceivingData.Schedule.Friday || false,
                  "Schedule.Saturday": ReceivingData.Schedule.Saturday || false,
                  Stock_availability: ReceivingData.Stock_availability || false,
                  Stackable: Stackable,
                  Milk_YesOrNo: ReceivingData.is_milk,
                  Type: ReceivingData.milk_varietes,
                  Product_Status: StockStatus,
                  Current_Stock: 0,
                  Total_Stock: 0,
                  Description: ReceivingData.Description,
                  OdooId: ReceivingData.OdooId,
                  CompanyId: ReceivingData.CompanyId,
                  File_Name: '',
                  Active_Status: ReceivingData.Active_Status,
                  If_Deleted: false
               });
               Create_Product.save(function (err_1, result_1) {
                  if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Product Management!.", Error: err_1 });
                  } else {
                     if (ReceivingData.Image) {
                        var reportData = ReceivingData.Image.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                        var buff = Buffer.from(reportData, 'base64');
                        const fineName = 'Uploads/Products/' + result_1._id + '.png';
                        result_1.File_Name = result_1._id + '.png';
                        var FileName = result_1.File_Name;
                        ProductManagement.ProductManagementSchema.updateOne({ _id: result_1._id }, { File_Name: FileName }).exec();
                        fs.writeFileSync(fineName, buff);
                     }
                     res.status(200).send({ Status: true, Message: 'Product details successfully Created' });
                  }
               });
            } else {
               res.status(200).send({ Status: true, Message: 'Already this is Product type added!!!!' });
            }
         }
      });
   }
};


// Product Management Update --------------------------------------------
exports.ProductManagement_Update = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.OdooId || ReceivingData.OdooId === '') {
      res.status(400).send({ Status: false, Message: "Product Details can not be empty" });
   } else {
      ProductManagement.ProductManagementSchema.findOne({ OdooId: ReceivingData.OdooId }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product Management!.", Error: err });
         } else {
            if (result !== null) {
               var StockStatus;
               var Stackable;
               if (ReceivingData.type === 'product') {
                  StockStatus = 'Stock_Available';
                  Stackable = true;
               } else if (ReceivingData.type === 'consu') {
                  StockStatus = 'Consumable';
                  Stackable = false;
               }

               result.Category = ReceivingData.Category;
               result.Sub_Category.Name = ReceivingData.Sub_Category.Name || null;
               result.Sub_Category.Parent_Name = ReceivingData.Sub_Category.Parent_Name || null;
               result.Product_Name = ReceivingData.Product_Name;
               result.BasicUnitQuantity = ReceivingData.BasicUnitQuantity;
               result.Unit = ReceivingData.Unit;
               result.Price = ReceivingData.Price;
               result.Milk_YesOrNo = ReceivingData.is_milk;
               result.Type = ReceivingData.milk_varietes; 
               result.Schedule.Monday = ReceivingData.Schedule.Monday || false;
               result.Schedule.Tuesday = ReceivingData.Schedule.Tuesday || false;
               result.Schedule.Wednesday = ReceivingData.Schedule.Wednesday || false;
               result.Schedule.Thursday = ReceivingData.Schedule.Thursday || false;
               result.Schedule.Friday = ReceivingData.Schedule.Friday || false;
               result.Schedule.Saturday = ReceivingData.Schedule.Saturday || false;
               result.Schedule.Sunday = ReceivingData.Schedule.Sunday || false;
               result.Stock_availability = ReceivingData.Stock_availability || false;
               result.Stackable = Stackable;
               result.Product_Status = StockStatus;
               result.Description = ReceivingData.Description;
               result.Active_Status = ReceivingData.Active_Status;

               result.save(function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Product Management!.", Error: err_1 });
                  } else {
                     if (ReceivingData.Image) {
                        var reportData = ReceivingData.Image.replace(/^data:[a-z]+\/[a-z]+;base64,/, "").trim();
                        var buff = Buffer.from(reportData, 'base64');
                        const fineName = 'Uploads/Products/' + result_1._id + '.png';
                        result_1.File_Name = result_1._id + '.png';
                        var FileName = result_1.File_Name;
                        ProductManagement.ProductManagementSchema.updateOne({ _id: result_1._id }, { File_Name: FileName }).exec();
                        fs.writeFileSync(fineName, buff);
                     }
                     res.status(400).send({ Status: true, Message: 'Product details successfully updated' });
                  }
               });
            } else {
               res.status(400).send({ Status: false, Message: 'Product ID Invalid' });
            }
         }
      });
   }
};


// Stock history management Create---------------------------------------
exports.Stock_Management_Create = function (req, res) {
    var ReceivingData = req.body;
    
    if (!ReceivingData.ProductOdooId || ReceivingData.ProductOdooId === '') {
        res.status(400).send({ Status: false, Message: "Products Details is required" });
    } else {
      
      ProductManagement.ProductManagementSchema.findOne({ OdooId: ReceivingData.ProductOdooId }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Stock Management!.", Error: err });
         } else {
            if (result !== null) {
               // Stock History Maintenance System----------------------------
               const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                  ProductId: mongoose.Types.ObjectId(result._id),
                  OdooId: ReceivingData.ProductOdooId,
                  Previous_Stock: 0,
                  Current_Stock: ReceivingData.Total_Stock,
                  Total_Stock: ReceivingData.Total_Stock,
                  ChangeType: 'Created_By_odoo',                        
                  Quantity: ReceivingData.Quantity,
                  If_orderedId: null,
                  Active_Status: true,
                  If_Deleted: false
               });
               Create_StockHistory.save(function (err_2, result_2) {
                  if (err_2) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Stock Management!.", Error: err_2 });
                  } else {
                     result.Total_Stock = result_2.Total_Stock;
                     result.Current_Stock = result_2.Current_Stock;
                     result.save();
                     res.status(200).send({ Status: true, Message: 'Successfully Stock history Created' });
                  }
               });
            } else {
               res.status(400).send({ Status: false, Message: 'Product Details Invalid' });
            }
         }
      });
   }
};


// Stock Management Update --------------------------------------------
exports.StockManagement_Update = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.ProductOdooId || ReceivingData.ProductOdooId === '') {
      res.status(400).send({ Status: false, Message: "Stock Details can not be empty" });
   } else if (!ReceivingData.Total_Stock || ReceivingData.Total_Stock === '') {
      res.status(400).send({ Status: false, Message: "Stock Quantity Details can not be empty" });
   } else {
      ProductManagement.StockHistoryManagementSchema.findOne({ OdooId: ReceivingData.ProductOdooId }, {}, { sort: { createdAt: -1 } })
      .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Stock History Details!.", Error: err });
         } else {
            if (result !== null) {
               if (result.Total_Stock < ReceivingData.Total_Stock ) { // Stack Added by Odoo

                  const NewStack = ReceivingData.Total_Stock - result.Total_Stock;
                  const Add_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                     ProductId: result.ProductId,
                     OdooId: result.OdooId,
                     Previous_Stock: result.Current_Stock,
                     Current_Stock: result.Current_Stock + NewStack,
                     Total_Stock: result.Total_Stock + NewStack,
                     ChangeType: 'Add_By_odoo',                        
                     Quantity: NewStack,
                     If_orderedId: null,
                     Active_Status: true,
                     If_Deleted: false
                  });
                  Add_StockHistory.save(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Stock history!.", Error: err_1 });
                     } else {
                        ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: result.ProductId },
                           { $set: { Total_Stock: result_1.Total_Stock,
                                     Current_Stock: result_1.Current_Stock }
                        }).exec();
                        res.status(200).send({ Status: true, Message: 'Successfully Stock history updated' });
                     }
                  });

               } else if (result.Total_Stock > ReceivingData.Total_Stock ) { // Stack Reduced by Odoo

                  const ReducedStack = result.Total_Stock - ReceivingData.Total_Stock;
                  const CurrentStack = (result.Current_Stock - ReducedStack) >= 0 ? (result.Current_Stock - ReducedStack) : 0 ;
                  const Reduce_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                     ProductId: result.ProductId._id,
                     OdooId: result.OdooId,
                     Previous_Stock: result.Total_Stock,
                     Current_Stock: CurrentStack,
                     Total_Stock: result.Total_Stock - ReducedStack,
                     ChangeType: 'Reduce_By_Odoo',                        
                     Quantity: ReducedStack,
                     If_orderedId: null,
                     Active_Status: true,
                     If_Deleted: false
                  });
                  Reduce_StockHistory.save(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Updating the Stock history!.", Error: err_1 });
                     } else {
                        if (result_1.Current_Stock > 0) {
                           ProductManagement.ProductManagementSchema
                           .updateOne(
                              { _id: result.ProductId },
                              { $set: { Total_Stock: result_1.Total_Stock,
                                        Current_Stock: result_1.Current_Stock }
                           }).exec();
                        } else {
                           ProductManagement.ProductManagementSchema
                           .updateOne(
                              { _id: result.ProductId },
                              { $set: { Total_Stock: result_1.Total_Stock,
                                        Current_Stock: result_1.Current_Stock,
                                        Stock_availability: false }
                           }).exec();
                        }
                        res.status(200).send({ Status: true, Message: 'Successfully Stock history updated' });
                     }
                  });

               } else { 
                  res.status(200).send({ Status: true, Message: 'Stock Updated Successfully' });
               }
            } else {
               res.status(400).send({ Status: false, Message: 'Stock Details Invalid' });
            }
         }
      });
   }
};
