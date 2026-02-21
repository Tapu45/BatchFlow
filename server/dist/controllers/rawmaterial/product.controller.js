"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawMaterialProductController = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
class RawMaterialProductController {
    // Create a new raw material product
    static async createRawMaterialProduct(req, res) {
        try {
            const { skuCode, name, category, unitOfMeasurement, minReorderLevel, vendorId, } = req.body;
            const product = await prisma.rawMaterialProduct.create({
                data: {
                    skuCode,
                    name,
                    category,
                    unitOfMeasurement,
                    minReorderLevel,
                    vendorId: vendorId || null,
                },
            });
            await prisma.transactionLog.create({
                data: {
                    type: 'CREATE',
                    entity: 'RawMaterialProduct',
                    entityId: product.id,
                    userId: req.user?.id || 'system',
                    description: `Created raw material product: ${product.name} (${product.skuCode})`,
                },
            });
            res.status(201).json(product);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create raw material product', details: error });
        }
    }
    // Get all raw material products (with optional filter by category or vendor)
    static async getRawMaterialProducts(req, res) {
        try {
            const { category, vendorId } = req.query;
            const where = {};
            if (category)
                where.category = category;
            if (vendorId)
                where.vendorId = vendorId;
            const products = await prisma.rawMaterialProduct.findMany({ where });
            res.json(products);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch raw material products', details: error });
        }
    }
    // Get a single raw material product by ID
    static async getRawMaterialProductById(req, res) {
        try {
            const { id } = req.params;
            const product = await prisma.rawMaterialProduct.findUnique({ where: { id } });
            if (!product) {
                res.status(404).json({ error: 'Raw material product not found' });
            }
            res.json(product);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch raw material product', details: error });
        }
    }
    // Update raw material product details
    static async updateRawMaterialProduct(req, res) {
        try {
            const { id } = req.params;
            const { skuCode, name, category, unitOfMeasurement, minReorderLevel, vendorId, } = req.body;
            const product = await prisma.rawMaterialProduct.update({
                where: { id },
                data: {
                    skuCode,
                    name,
                    category,
                    unitOfMeasurement,
                    minReorderLevel,
                    vendorId: vendorId || null,
                },
            });
            await prisma.transactionLog.create({
                data: {
                    type: 'UPDATE',
                    entity: 'RawMaterialProduct',
                    entityId: product.id,
                    userId: req.user?.id || 'system',
                    description: `Updated raw material product: ${product.name} (${product.skuCode})`,
                },
            });
            res.json(product);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update raw material product', details: error });
        }
    }
    // Delete a raw material product
    static async deleteRawMaterialProduct(req, res) {
        try {
            const { id } = req.params;
            const deletedProduct = await prisma.rawMaterialProduct.delete({ where: { id } });
            // Transaction log
            await prisma.transactionLog.create({
                data: {
                    type: 'DELETE',
                    entity: 'RawMaterialProduct',
                    entityId: deletedProduct.id,
                    userId: req.user?.id || 'system',
                    description: `Deleted raw material product: ${deletedProduct.name} (${deletedProduct.skuCode})`,
                },
            });
            res.json({ message: 'Raw material product deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete raw material product', details: error });
        }
    }
}
exports.RawMaterialProductController = RawMaterialProductController;
