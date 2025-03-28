const Category = require('../model/categoryModel');
const Product = require('../model/productModel');

const categoryController = {};

categoryController.addCategory = async (req, res) => {
  try {
    const { categoryName: name, listUnlist } = req.body;
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category name already exists!' });
    }
    const listed = listUnlist === 'list' ? true : false;
    const newCategory = new Category({ name, listed });
    await newCategory.save();
    res.status(201).json({ success: true, message: 'Category added successfully', category: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add category', error: error.message });
  }
};

categoryController.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, listed, offerPercentage, offerActive } = req.body;
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { name, listed, offerPercentage, offerActive },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

categoryController.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted successfully', category: deletedCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};

categoryController.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

categoryController.showCategoryPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 6;
    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / pageSize);
    const categories = await Category.find()
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    res.render('admin/Categories', { categories, totalPages, currentPage: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

categoryController.renderEditCategoryPage = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    res.render('EditCategory', { category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category for editing', error: error.message });
  }
};

categoryController.editCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name, description } = req.body;
    await Category.findByIdAndUpdate(categoryId, { name, description });
    res.redirect('/showcategory');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

categoryController.listCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { status: 'active' }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category listed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list category', error: error.message });
  }
};

categoryController.unlistCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { status: 'inactive' }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category unlisted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unlist category', error: error.message });
  }
};

categoryController.fetchSingleCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
};

categoryController.showAddCategoryPage = async (req, res) => {
  try {
    res.render('admin/AddCategory');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
  }
};

categoryController.applyOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { offerPercentage } = req.body;

    if (!offerPercentage || typeof offerPercentage !== 'number' || offerPercentage < 0 || offerPercentage > 100) {
      return res.status(400).json({ success: false, message: 'Invalid offer percentage' });
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { offerPercentage, offerActive: true },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const productCategory = await Product.find({ category: categoryId });

    for (const product of productCategory) {
      const discountAmount = Math.floor(product.regularPrice * (offerPercentage / 100));
      product.productOffer = discountAmount;
      product.salesPrice -= discountAmount;
      product.offerPrice = product.salesPrice;
      await product.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Category offer successfully applied',
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to apply offer',
      error: error.message
    });
  }
};

categoryController.removeOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { offerPercentage: 0, offerActive: false },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Offer removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove offer' });
  }
};

module.exports = categoryController;