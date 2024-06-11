var schedule = require('node-schedule');
var axios = require('axios');
var moment = require('moment');
var OrderManagement =  require('./mobile_api/models/order_management.model');
var InvoicePDF = require('./api/models/Invoice_pdf.models');
const fs = require('fs');
var mongoose = require('mongoose');

// var WeeklySaleGenerating = schedule.scheduleJob('59 59 23 */7 * *', function() {
   
//    var EndDate = new Date();
//    var StartDate = new Date(new Date().setDate(new Date().getDate() - 6));
//    EndDate = new Date(EndDate.setHours(23, 59, 59, 999));
//    StartDate = new Date(StartDate.setHours(0, 0, 0, 0));

//    Promise.all([
//       OrderManagement.OrderSchema.find({
//          OrderDelivered: true,
//          $and: [{ DeliveryDate: { $gte: StartDate } }, { DeliveryDate: { $lte: EndDate } }],
//          Order_Type: {$ne: 'Sample_From'},
//          Active_Status: true,
//          If_Deleted: false,
//       }, {}, {})
//          .populate({ path: 'CustomerId', select: ['OdooId', 'CompanyId', 'Region'] })
//          .populate({ path: 'Region', select: 'OdooId' })
//          .populate({ path: 'Item_Details.ProductId', select: ['CompanyId', 'OdooId', 'Unit'] })
//       .exec()
//    ]).then(Response => {
//       var OrderDetails = Response[0];
//       OrderDetails = OrderDetails.filter(obj => obj.CustomerId.OdooId !== undefined && obj.CustomerId.OdooId !== null && obj.CustomerId.OdooId !== '' );
//       var SaleOrderArray = [];
//       OrderDetails.map(Obj => {
//          var SaleOrder = {
//             partner_id: Obj.CustomerId.OdooId,
//             company_id: Obj.CustomerId.CompanyId,
//             region_id: Obj.Region.OdooId,
//             mean_stack_id: Obj._id,
//             order_line: []
//          };
//          Obj.Item_Details.map(Obj1 => {
//             Obj1.ProductId.OdooId = Obj1.ProductId.OdooId !== null && Obj1.ProductId.OdooId !== '' ? Obj1.ProductId.OdooId : '0';
//             Obj1.BasicUnitQuantity = Obj1.BasicUnitQuantity !== undefined ? Obj1.BasicUnitQuantity : Obj1.ProductId.BasicUnitQuantity;
//             Obj1.Quantity = Obj.Order_Type !== 'Subscription_From' ? Obj1.Quantity : (Obj1.Quantity / Obj1.BasicUnitQuantity);
//             SaleOrder.order_line.push({
//                "product_id": Obj1.ProductId.OdooId,
//                "company_id": Obj1.ProductId.CompanyId,
//                "period": Obj.DeliveredSession,
//                "date": moment(new Date(Obj.DeliveryDate)).format("DD-MM-YYYY"),
//                "quantity": Obj1.Quantity,
//                "uom_id": Obj1.ProductId.Unit,
//                "unit_quantity": Obj1.BasicUnitQuantity,
//                "price_unit": Obj1.Unit_Price
//             });
//          });
//          if (Obj.CustomerId.OdooId !== null) {
//             SaleOrderArray.push(SaleOrder);
//          }
//       });
//       axios({
//          method: 'get', url: 'https://www.vilfresh.in/api/sale_order/create', data: {
//             params: {
//                rec: SaleOrderArray
//             }
//          }
//       }).then(function (response) {
//          // console.log(response.data.result);
//       });
//    }).catch(errorRes => {
//       console.log('Sale order Odoo update error');
//    });
// });

// var MonthEndSaleGenerating = schedule.scheduleJob('1 0 0 1 * *', function() {
   
//    var EndDate = new Date(new Date().setDate(new Date().getDate() - 1));
//    var StartDate = new Date(new Date().setDate(29));

//    if (EndDate.getDate() > 28) {
//       EndDate = new Date(EndDate.setHours(23, 59, 59, 999));
//       StartDate = new Date(StartDate.setHours(0, 0, 0, 0));

//       Promise.all([
//          OrderManagement.OrderSchema.find({
//             OrderDelivered: true,
//             $and: [{ DeliveryDate: { $gte: StartDate } }, { DeliveryDate: { $lte: EndDate } }],
//             Order_Type: {$ne: 'Sample_From'},
//             Active_Status: true,
//             If_Deleted: false,
//          }, {}, {})
//             .populate({ path: 'CustomerId', select: ['OdooId', 'CompanyId', 'Region'] })
//             .populate({ path: 'Region', select: 'OdooId' })
//             .populate({ path: 'Item_Details.ProductId', select: ['CompanyId', 'OdooId', 'Unit'] })
//          .exec()
//       ]).then(Response => {
//          var OrderDetails = Response[0];
//          OrderDetails = OrderDetails.filter(obj => obj.CustomerId.OdooId !== undefined && obj.CustomerId.OdooId !== null && obj.CustomerId.OdooId !== '' );
//          var SaleOrderArray = [];
//          OrderDetails.map(Obj => {
//             var SaleOrder = {
//                partner_id: Obj.CustomerId.OdooId,
//                company_id: Obj.CustomerId.CompanyId,
//                region_id: Obj.Region.OdooId,
//                mean_stack_id: Obj._id,
//                order_line: []
//             };
//             Obj.Item_Details.map(Obj1 => {
//                Obj1.ProductId.OdooId = Obj1.ProductId.OdooId !== null && Obj1.ProductId.OdooId !== '' ? Obj1.ProductId.OdooId : '0';
//                Obj1.BasicUnitQuantity = Obj1.BasicUnitQuantity !== undefined ? Obj1.BasicUnitQuantity : Obj1.ProductId.BasicUnitQuantity;
//                Obj1.Quantity = Obj.Order_Type !== 'Subscription_From' ? Obj1.Quantity : (Obj1.Quantity / Obj1.BasicUnitQuantity);
//                SaleOrder.order_line.push({
//                   "product_id": Obj1.ProductId.OdooId,
//                   "company_id": Obj1.ProductId.CompanyId,
//                   "period": Obj.DeliveredSession,
//                   "date": moment(new Date(Obj.DeliveryDate)).format("DD-MM-YYYY"),
//                   "quantity": Obj1.Quantity,
//                   "uom_id": Obj1.ProductId.Unit,
//                   "unit_quantity": Obj1.BasicUnitQuantity,
//                   "price_unit": Obj1.Unit_Price
//                });
//             });
//             if (Obj.CustomerId.OdooId !== null) {
//                SaleOrderArray.push(SaleOrder);
//             }
//          });
//          axios({
//             method: 'get', url: 'https://www.vilfresh.in/api/sale_order/create', data: {
//                params: {
//                   rec: SaleOrderArray
//                }
//             }
//          }).then(function (response) {
//             // console.log(response.data.result);
//          });
//       }).catch(errorRes => {
//          console.log('Sale order Odoo update error');
//       });
//    }
// });



var LastMonthSaleGenerating = schedule.scheduleJob('1 0 0 1 * *', function() {

	console.log('Cron Started');

   var StartDate = new Date(new Date(new Date().setMonth(new Date().getMonth() - 1)).setDate(1));
   var EndDate = new Date(new Date().setDate(0));
   EndDate = new Date(EndDate.setHours(23, 59, 59, 999));
   StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
	var monthEndDate =  moment(new Date(EndDate)).format("YYYY-MM-DD");

	Promise.all([
		OrderManagement.OrderSchema.find({
			OrderDelivered: true,
			$and: [{ DeliveryDate: { $gte: StartDate } }, { DeliveryDate: { $lte: EndDate } }],
			Order_Type: {$ne: 'Sample_From'},
			Active_Status: true,
			If_Deleted: false,
		}, {}, {})
			.populate({ path: 'CustomerId', select: ['OdooId', 'CompanyId', 'Region'] })
			.populate({ path: 'Region', select: 'OdooId' })
			.populate({ path: 'Item_Details.ProductId', select: ['CompanyId', 'OdooId', 'Unit', 'Active_Status'] })
		.exec()
	]).then(Response => {
		var OrderDetails = Response[0];
		var SaleOrderArray = [];
		// console.log(OrderDetails.length);
		OrderDetails = OrderDetails.filter(obj => obj.CustomerId.OdooId !== undefined && obj.CustomerId.OdooId !== null && obj.CustomerId.OdooId !== '' );
		OrderDetails.map(Obj => {
			var SaleOrder = {
				partner_id: Obj.CustomerId.OdooId,
				company_id: Obj.CustomerId.CompanyId,
				region_id: Obj.Region.OdooId,
				record_date: monthEndDate,
				order_line: []
			};
			Obj.Item_Details.map(Obj1 => {
				Obj1.ProductId.OdooId = Obj1.ProductId.OdooId !== null && Obj1.ProductId.OdooId !== '' ? Obj1.ProductId.OdooId : '0';
				Obj1.BasicUnitQuantity = Obj1.BasicUnitQuantity !== undefined ? Obj1.BasicUnitQuantity : Obj1.ProductId.BasicUnitQuantity;
				Obj1.Quantity = Obj.Order_Type !== 'Subscription_From' ? Obj1.Quantity : (Obj1.Quantity / Obj1.BasicUnitQuantity);
					SaleOrder.order_line.push({
						"mean_stack_id": Obj._id,
						"product_id": Obj1.ProductId.OdooId,
						"company_id": Obj1.ProductId.CompanyId,
						"period": Obj.DeliveredSession,
						"date": moment(new Date(Obj.DeliveryDate)).format("DD-MM-YYYY"),
						"quantity": Obj1.Quantity,
						"uom_id": Obj1.ProductId.Unit,
						"unit_quantity": Obj1.BasicUnitQuantity,
						"price_unit": Obj1.Unit_Price
					});
			});
			if (SaleOrder.order_line.length > 0) {
				const existIndex = SaleOrderArray.findIndex(obj => obj.partner_id === Obj.CustomerId.OdooId);
				if (existIndex >= 0) {
					SaleOrderArray[existIndex].order_line.push(SaleOrder.order_line[0]);
				} else {
					SaleOrderArray.push(SaleOrder);
				}
			}
		});

		console.log('Month ' + monthEndDate + ' ----- ' + SaleOrderArray.length +  ' Orders');

		function createPromise(cus) {
			return new Promise(resolvePromise => {
				axios({
					method: 'get', url: 'https://www.vilfresh.in/api/sale_order/create', data: {
						params: {
							rec: [cus]
						}
					}
				}).then(function (response) {
					resolvePromise({ Status: 'Success', Request: JSON.stringify(cus), result: JSON.stringify(response.data)});
				}).catch(errorRes => {
					console.log('Month ' + monthEndDate + ' Sale order Odoo update error');
				});
			});
		}
		var ReturnArr = [];
		function executeSequentially(array) {
			return createPromise(array.shift()).then(cus => {
				if (array.length !== 0 && (array.length) % 500 === 0) console.log( 'Month ' + monthEndDate + ' Remaining: ', array.length);
				ReturnArr.push(cus);
				return array.length === 0 ? ReturnArr : executeSequentially(array);
			});
		}
		executeSequentially(SaleOrderArray).then(response => {
			console.log(monthEndDate + ' Month Sale Cron Success');
		});
	}).catch(errorRes => {
		console.log('Month ' + monthEndDate + ' Sale order process error');
	});
});


module.exports = {
   // CustomerWeeklySaleGenerating : WeeklySaleGenerating,
   // CustomerMonthEndSaleGenerating : MonthEndSaleGenerating,
   CustomerLastMonthSaleGenerating : LastMonthSaleGenerating
};

