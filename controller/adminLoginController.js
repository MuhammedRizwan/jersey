const jwt = require('jsonwebtoken');
const User = require('../model/userSchema');
const bcrypt = require('bcrypt');
const productModel = require('../model/productModel');
const OrderModel=require('../model/orderScheema')
const CategoryModel = require("../model/categoryModel")
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { createTable } = require('pdfkit-table');
const adminLoginController = {};

const secretKey = "your_secret_key";

adminLoginController.renderLoginForm = (req, res) => {
  res.render('admin/adminlog');
};

adminLoginController.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Look for a user with the provided email and the isAdmin flag set to true
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render('admin/adminlog', { error: "Admin not found. Please contact support." });
    }

    if (admin.isBlocked) {
      return res.render('admin/adminlog', { error: "Your account has been blocked. Please contact support." });
    }

    console.log(password,"password")
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.render('admin/adminlog', { error: "Incorrect password. Please try again." });
    }

    // If login is successful, create a JWT token with an expiration time of 1 hour
    const token = jwt.sign({ email: admin.email, isAdmin: true }, secretKey, { expiresIn: '1h' });
    req.session.isAdmin = true;
    req.session.adminToken = token;

    // Redirect to the admin dashboard
    res.redirect('/admin/adminDashboard');

  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).send('An error occurred during login');
  }
  

};

adminLoginController.addProductPage = async(req,res)=>{

  const products=await productModel.find()

    return res.render('admin/Addprd',{products});
  }



  adminLoginController.dashbordRedirect = async (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect('/admin/adminLogin');
    }
    try {
        const user = await User.find({ is_admin: false });
        const orders = await OrderModel.find({});
        const products = await productModel.find({});
        const categories = await CategoryModel.find({});

        // Calculate total revenue
        const totalRevenue = orders.reduce((acc, order) => {
            if (order.status === 'Completed' && order.payment !== 'Cash On Delivery') {
                acc += order.products.reduce(
                    (subTotal, product) => subTotal + product.price * product.quantity,
                    0
                );
            }
            return acc;
        }, 0);

        // Calculate total orders
        const totalOrder = orders.reduce((acc, order) => {
            if (order.status !== 'Cancelled') {
                acc += order.products.length;
            }
            return acc;
        }, 0);

        // Calculate monthly revenue
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const monthlyOrders = await OrderModel.find({
            createdOn: { $gte: firstDayOfMonth },
        });

        const monthlyRevenue = monthlyOrders.reduce((acc, order) => {
            if (order.status === 'Completed' && order.payment !== 'Cash On Delivery') {
                acc += order.products.reduce(
                    (subTotal, product) => subTotal + product.price * product.quantity,
                    0
                );
            }
            return acc;
        }, 0);

      const productSales = {};

orders.forEach(order => {
    order.products.forEach(item => {
        if (!productSales[item.productId]) {
            const productDetails = products.find(
                p => p._id.toString() === item.productId.toString()
            );
            if (productDetails) {
                productSales[item.productId] = {
                    quantity: 0,
                    productName: productDetails.productName || 'Unnamed Product',
                    category: categories.find(c => c._id.equals(productDetails.category))?.name || 'Unknown',
                    images: productDetails.images || ['default-placeholder.png'], // Provide default placeholder
                };
            }
        }
        if (productSales[item.productId]) {
            productSales[item.productId].quantity += item.quantity;
        }
    });
});


        const topProductDetails = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Render the dashboard
        if (user) {
            res.render("admin/adminDashboard", {
                title: "Admin Dashboard",
                user,
                revenue: totalRevenue,
                orders: totalOrder,
                product: products.length,
                category: categories.length,
                monthlyRevenue,
                topProductDetails,
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
};



// adminLogOut
adminLoginController.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error during logout');
    }
    res.redirect('/admin/adminLogin'); // Redirect to admin login page after logout
  });
};
const getOrders = async (startDate, endDate) => {
  try {
    const query = {};

    if (startDate && endDate) {
      query.createdOn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await OrderModel.find(query)
      .populate('products.productId')
      .populate('user')
      .exec();

    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};
const ITEMS_PER_PAGE = 10; // Adjust the number of items per page as desired

adminLoginController.salesReport = async (req, res) => {
  try {
    const { reportType = '1-day', startDate, endDate } = req.query;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || ITEMS_PER_PAGE;

    // Ensure page is at least 1
    page = page > 0 ? page : 1;
    let start, end;
    switch (reportType) {
      case '1-day':
        start = moment().startOf('day');
        end = moment().endOf('day');
        break;
      case 'week':
        start = moment().startOf('week');
        end = moment().endOf('week');
        break;
      case 'month':
        start = moment().startOf('month');
        end = moment().endOf('month');
        break;
      case 'custom':
        if (startDate && endDate) {
          start = moment(startDate).startOf('day');  
          end = moment(endDate).endOf('day');        
          if (start.isAfter(end)) {
            return res.status(400).send("Start date should be before end date.");
          }
        } else {
          return res.status(400).send("Please provide both start and end dates.");
        }
        break;
      default:
        return res.status(400).send("Invalid report type.");
    }

    // Calculate total orders within date range for pagination
    const totalOrders = await OrderModel.countDocuments({
      createdOn: { $gte: start.toDate(), $lte: end.toDate() }, status: "Completed"
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch paginated orders based on the date range
    const orders = await OrderModel.find({
      createdOn: { $gte: start.toDate(), $lte: end.toDate()},status:"Completed",
    })
      .populate('user')
      .populate('products.productId')
      .skip((page - 1) * limit)
      .limit(limit);

    // Calculate totals
    const totalSalesCount = totalOrders;
    const totalSalesAmount = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    const totalDiscount = orders.reduce((acc, order) => acc + (order.couponDiscount || 0), 0);

    res.render('admin/salesReport', {
      orders,
      totalSalesCount,
      totalSalesAmount,
      totalDiscount,
      currentPage: page,
      totalPages,
      limit,
      reportType,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).send("Internal Server Error");
  }
};


adminLoginController.downloadSalesReportPDF = async (req, res) => {
  try {
    const { orders, totalSalesCount, totalSalesAmount } = req.body;
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    // Title and summary
    doc.fontSize(18).text('Sales Report', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Total Sales Count: ${totalSalesCount}`);
    doc.text(`Total Sales Amount: $${totalSalesAmount.toFixed(2)}`).moveDown();

    // Draw table
    const startY = doc.y;
    const rowHeight = 20;
    const tableTop = startY + 30;

    doc.fontSize(10);
    
    // Headers
    const headers = ['ORDER ID', 'Date', 'Customer', 'Product', 'Quantity', 'Total', 'Status'];
    headers.forEach((header, i) => {
      doc.text(header, 50 + i * 70, tableTop);
    });

    // Draw rows
    let y = tableTop + rowHeight;
    orders.forEach(order => {
      order.products.forEach(product => {
        doc.text(`#${order.orderNumber}`, 50, y);
        doc.text(new Date(order.createdOn).toLocaleDateString(), 120, y);
        doc.text(order.user ? order.user.name : 'N/A', 190, y);
        doc.text(product.productId ? product.productId.productName : 'N/A', 260, y);
        doc.text(product.quantity.toString(), 330, y);
        doc.text(`$${order.totalPrice.toFixed(2)}`, 400, y);
        doc.text(order.status, 470, y);
        y += rowHeight;
      });
    });

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
};

adminLoginController.downloadSalesReportExcel = async (req, res) => {
  try {
    const { orders, totalSalesCount, totalSalesAmount } = req.body;

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add title and summary
    worksheet.addRow(['Sales Report']);
    worksheet.mergeCells('A1:G1');  // Merge cells for the title
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.addRow([]);
    worksheet.addRow(['Total Sales Count:', totalSalesCount]);
    worksheet.addRow(['Total Sales Amount:', `$${totalSalesAmount.toFixed(2)}`]);
    worksheet.addRow([]);

    // Define table headers
    const headers = ['ORDER ID', 'Date', 'Customer', 'Product', 'Quantity', 'Total', 'Status'];
    worksheet.addRow(headers);

    // Set column widths
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Product', key: 'product', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Populate rows with order data
    orders.forEach(order => {
      order.products.forEach(product => {
        worksheet.addRow({
          orderId: `#${order.orderNumber}`,
          date: new Date(order.createdOn).toLocaleDateString(),
          customer: order.user ? order.user.name : 'N/A',
          product: product.productId ? product.productId.productName : 'N/A',
          quantity: product.quantity,
          total: `$${order.totalPrice.toFixed(2)}`,
          status: order.status,
        });
      });
    });

    // Set response headers and send the Excel file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=sales-report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).send("Error generating Excel report");
  }
};



 adminLoginController.saleChart = async(req,res)=>{
    
  try {
      if (!req.query.interval) {
          return res.status(400).json({ error: "Missing interval parameter" });
      }
      const interval = req.query.interval.toLowerCase();
      let dateFormate , groupByFormat ;
      switch (interval) {

          case "yearly":

              dateFormate = "%Y";
              groupByFormat = {
                  $dateToString : { format: "%Y" , date : "$createdOn" },
              }
              break;

              case "monthly":
                  dateFormate = "%Y-%m";
                  groupByFormat = {
                      $dateToString: { format: "%m-%Y", date: "$createdOn" },
                  };
                  break;

          case "daily":

                  dateFormate = "%Y-%m-%d";
                  groupByFormat = {
                  $dateToString : { format: "%Y-%m-%d" , date : "$createdOn" },
                  }
                  break;

          default:
                  console.error("Error: Invalid time interval");
                  return res.status(400).json({ error: "Invalid time interval" });
              }

              const salesData = await OrderModel.aggregate([
              {    
                  $group : {
                      _id : groupByFormat,
                      totalSales : { $sum : "$totalPrice" },
                      topProduct : { $first : "$productName" }
                  },
              },
              {
                  $sort : { _id : 1 }
              },

              ])

              const monthNames = [
                  "January" , "February" , "March" , "April" , "May" , "June",
                  "July" , "August" , "September" , "October" , "November" ,
                  "December"
              ];

              const labels = salesData.map((item) => {
                  if (interval === "monthly") {
                      const [ month , year ] = item._id.split('-');
                      return `${monthNames[parseInt(month) -1 ]} ${year}`
                  }

                  return item._id
              } )

              

              const values = salesData.map((item) => item.totalSales )
              const topProductDetails = salesData.map((item) => item.topProduct )

              res.json({ labels , values ,topProductDetails })

  } catch (error) {
      console.log(error.message);
  }
}

module.exports = adminLoginController;
