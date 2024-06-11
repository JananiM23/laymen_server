var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var OrderSchema = mongoose.Schema({
   CustomerId: {type: Schema.Types.ObjectId, ref: 'Customer_Management'},
   FromBasket: { type: Schema.Types.ObjectId, ref: "VilfreshBasket_CustomerRequests" },
   Order_Reference: { type: String }, // E.g: Ord-00000001
   Order_Unique: { type: Number }, // e.g: 1
   Order_Type: { type: String}, // From_Order, From_Basket, Subscription_From, Sample_From 
   Item_Details: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" },
      FromCart: { type: Schema.Types.ObjectId, ref: "MyCart" },
      Quantity: { type: Number },
      BasicUnitQuantity : { type: Number },
      Unit_Price : { type: Number },
      Total_Amount : { type: Number },
   }],
   Item_Counts: { type: Number },
   Payable_Amount: { type: Number },
   Payment_Status : {type: String}, // Paid , UnPaid
   Payment_Type : { type: String}, // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
   If_Partial: { type: Boolean },
   ReduceFrom_Wallet: { type: Number },
   ReduceFrom_Online: { type: Number },
   ReduceFrom_Credit: { type: Number },
   DeliveryDate: { type : Date },
   OrderConfirmed: { type : Boolean },
   OrderConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
   DeliveredSession: {type: String},
   OrderDelivered: { type : Boolean },
   DeliveredDateTime: {type: Date},
   DeliveryNotes: {type: String},
   OrderUnDelivered: {type: Boolean},
   DeliveryPerson: { type: Schema.Types.ObjectId, ref: "DeliveryPerson" },
   Region: { type: Schema.Types.ObjectId, ref: "Region" },
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean }
},
   { timestamps: true }
);


var GeneratedOrdersSchema = mongoose.Schema({
   Session: { type: String }, // Morning, Evening
   Date: { type: Date },
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   DeliveryLine: { type: Schema.Types.ObjectId, ref: 'Delivery' },
   DeliveryPersons: [{ type: Schema.Types.ObjectId, ref: 'DeliveryPerson' }],
   GeneratedBy: {type: Schema.Types.ObjectId, ref: "User"  },
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean }
},
   { timestamps: true }
);

var PaymentTrackerSchema = mongoose.Schema({
	CustomerId: {type: Schema.Types.ObjectId, ref: 'Customer_Management'},
   OrdersReferenceId: { type: String, unique: true },
	OrderAmount: { type: Number },
	FromWallet: { type: Number },
	RazorpayOrderId: { type: String },
	CronDateTime: { type: Date },
	CronStatus: { type: String }, // Pending, ReAssigned, Completed
	CartItems: [{ type: Schema.Types.ObjectId, ref: "MyCart" }],
	OrderMode: { type: String }, // Online_Payment, WalletAndOnline_Reduce
	PaymentRequestType: { type: String }, // OrderPay, WalletRecharge
	PaymentStatus: { type: String }, // created, attempted, paid
	PaymentCompleted: { type: Boolean },
	ResponseString: [{ type: String }],
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean }
},
   { timestamps: true }
);


var varOrderSchema = mongoose.model('Order', OrderSchema, 'OrderManagement');
var varOrderArchiveSchema = mongoose.model('OrderArchive', OrderSchema, 'OrderManagement_Archive');
var varGeneratedOrdersSchema = mongoose.model('GeneratedOrders', GeneratedOrdersSchema, 'GeneratedOrders');
var varPaymentTrackerSchema = mongoose.model('PaymentTracker', PaymentTrackerSchema, 'PaymentTracker');


module.exports = {
   OrderSchema: varOrderSchema,
	OrderArchiveSchema: varOrderArchiveSchema,
   GeneratedOrdersSchema: varGeneratedOrdersSchema,
	PaymentTrackerSchema: varPaymentTrackerSchema
};